async function loadScriptData() {
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `./data.js?v=${Date.now()}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Dashboard data failed to load."));
    document.head.appendChild(script);
  });
  if (!window.WINDLENS_DASHBOARD_DATA) {
    throw new Error("Dashboard data is missing.");
  }
  return window.WINDLENS_DASHBOARD_DATA;
}

async function loadMapAsset() {
  const response = await fetch(`./assets/europe-map.json?v=${Date.now()}`);
  if (!response.ok) {
    throw new Error("Europe map asset failed to load.");
  }
  return response.json();
}

(async function () {
  const [data, mapAsset] = await Promise.all([loadScriptData(), loadMapAsset()]);

  const periodSelect = document.getElementById("period-select");
  const driverButtons = document.getElementById("driver-buttons");
  const mapTitle = document.getElementById("map-title");
  const legendMin = document.getElementById("legend-min");
  const legendMax = document.getElementById("legend-max");
  const mapPanel = document.querySelector(".map-panel");
  const detailOverlay = document.getElementById("detail-overlay");
  const detailClose = document.getElementById("detail-close");

  const detailMarketName = document.getElementById("detail-market-name");
  const detailPeriodDriver = document.getElementById("detail-period-driver");
  const detailImpact = document.getElementById("detail-impact");
  const detailReferenceLabel = document.getElementById("detail-reference-label");
  const detailReferenceValue = document.getElementById("detail-reference-value");
  const detailWarning = document.getElementById("detail-warning");
  const detailWarningText = document.getElementById("detail-warning-text");

  const mapSvg = document.getElementById("map-svg");
  const mapStage = document.querySelector(".map-stage");
  const panzoomLayer = document.getElementById("panzoom-layer");
  const countriesLayer = document.getElementById("countries-layer");
  const marketLayer = document.getElementById("market-layer");
  const labelLayer = document.getElementById("label-layer");

  const driverOrder = ["wind", "solar", "load", "residual_load"];
  const periodEntries = Object.entries(data.periods)
    .map(([code, period]) => ({ code, ...period }))
    .sort((left, right) => {
      const leftOrder = Number(left.sort_order ?? Number.MAX_SAFE_INTEGER);
      const rightOrder = Number(right.sort_order ?? Number.MAX_SAFE_INTEGER);
      return leftOrder - rightOrder || left.label.localeCompare(right.label);
    });
  const defaultPeriod = (
    periodEntries.find((period) => period.code === "year_2025")
    || periodEntries.find((period) => period.code === "all")
    || periodEntries[0]
  )?.code;
  const state = {
    period: defaultPeriod,
    driver: "wind",
    market: null,
  };
  const activeCodes = new Set(Object.keys(data.markets));
  const marketNodes = {};
  const labelAnchors = {};
  const labelGroups = {};
  const valueNodes = {};
  const viewState = {
    scale: 1,
    tx: 0,
    ty: 0,
    minScale: 1,
    maxScale: 6,
    dragging: false,
    pointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginTx: 0,
    dragOriginTy: 0,
    moved: false,
    dragThreshold: 6,
    downTargetCode: null,
  };

  mapSvg.setAttribute("viewBox", `0 0 ${mapAsset.viewBox.width} ${mapAsset.viewBox.height}`);

  function svgEl(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function svgPointFromEvent(event) {
    const rect = mapSvg.getBoundingClientRect();
    const scaleX = mapAsset.viewBox.width / rect.width;
    const scaleY = mapAsset.viewBox.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function clampTranslation() {
    const extraWidth = mapAsset.viewBox.width * (viewState.scale - 1);
    const extraHeight = mapAsset.viewBox.height * (viewState.scale - 1);
    viewState.tx = clamp(viewState.tx, -extraWidth, 0);
    viewState.ty = clamp(viewState.ty, -extraHeight, 0);
  }

  function applyViewTransform() {
    clampTranslation();
    panzoomLayer.setAttribute(
      "transform",
      `translate(${viewState.tx.toFixed(2)} ${viewState.ty.toFixed(2)}) scale(${viewState.scale.toFixed(4)})`,
    );
    Object.keys(labelGroups).forEach((code) => updateLabelTransform(code));
  }

  function zoomAt(pointX, pointY, nextScale) {
    const clampedScale = clamp(nextScale, viewState.minScale, viewState.maxScale);
    if (clampedScale === viewState.scale) {
      return;
    }
    const worldX = (pointX - viewState.tx) / viewState.scale;
    const worldY = (pointY - viewState.ty) / viewState.scale;
    viewState.scale = clampedScale;
    viewState.tx = pointX - worldX * viewState.scale;
    viewState.ty = pointY - worldY * viewState.scale;
    applyViewTransform();
  }

  function formatNumber(value, digits) {
    return new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  function formatReferenceGw(value) {
    return `${formatNumber(value / 1000, 1)} GW`;
  }

  function mapTitleForDriver(driver) {
    return `Impact of ${data.drivers[driver].label.toLowerCase()} forecast error on market price*`;
  }

  function currentMarkets() {
    return data.periods[state.period].drivers[state.driver].markets;
  }

  function impactRange(markets) {
    const values = Object.values(markets)
      .filter((market) => market && market.available && market.impact_per_1sigma_eur_per_mwh != null)
      .map((market) => market.impact_per_1sigma_eur_per_mwh);
    if (!values.length) {
      return { min: 0, max: 0 };
    }
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  function divergingLimit(min, max) {
    return Math.max(Math.abs(min), Math.abs(max));
  }

  function colorForValue(value, min, max) {
    const limit = divergingLimit(min, max);
    if (!Number.isFinite(limit) || limit <= 0) {
      return "hsl(216, 82%, 48%)";
    }
    const ratio = Math.min(Math.abs(value) / limit, 1);
    const hue = value >= 0 ? 216 : 14;
    const saturation = value >= 0 ? 82 : 88;
    const lightness = 90 - ratio * 44;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  function textColorForValue(value, min, max) {
    const limit = divergingLimit(min, max);
    if (!Number.isFinite(limit) || limit <= 0) {
      return "#0f172a";
    }
    return Math.abs(value) / limit > 0.62 ? "#ffffff" : "#0f172a";
  }

  function setLabelTheme(code, foreground) {
    const valueText = valueNodes[code];
    if (valueText) {
      valueText.setAttribute("fill", foreground);
    }
  }

  function updateLabelTransform(code) {
    const group = labelGroups[code];
    const anchor = labelAnchors[code];
    if (!group || !anchor) {
      return;
    }
    const inverseScale = 1 / viewState.scale;
    group.setAttribute(
      "transform",
      `translate(${anchor.x} ${anchor.y}) scale(${inverseScale.toFixed(4)})`,
    );
  }

  function buildLabel(code, label) {
    const x = label.x + (label.dx || 0);
    const y = label.y + (label.dy || 0);

    if (label.leader) {
      const leader = svgEl("line");
      leader.setAttribute("class", "leader-line");
      leader.setAttribute("x1", label.x);
      leader.setAttribute("y1", label.y);
      leader.setAttribute("x2", x);
      leader.setAttribute("y2", y);
      labelLayer.appendChild(leader);
    }

    const group = svgEl("g");
    group.setAttribute("class", "market-label");
    group.setAttribute("id", `label-${code}`);

    const valueText = svgEl("text");
    valueText.setAttribute("class", "market-value");
    valueText.setAttribute("x", "0");
    valueText.setAttribute("y", "0");
    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("dominant-baseline", "middle");
    valueText.textContent = "0.0 €/MWh";

    group.append(valueText);
    labelLayer.appendChild(group);
    labelAnchors[code] = { x, y };
    labelGroups[code] = group;
    valueNodes[code] = valueText;
    updateLabelTransform(code);
  }

  function buildMap() {
    countriesLayer.innerHTML = "";
    marketLayer.innerHTML = "";
    labelLayer.innerHTML = "";

    for (const country of mapAsset.countries) {
      const path = svgEl("path");
      path.setAttribute("d", country.path);

      if (activeCodes.has(country.code)) {
        path.setAttribute("id", `market-${country.code}`);
        path.setAttribute("class", "market-shape");
        path.dataset.code = country.code;
        marketLayer.appendChild(path);
        marketNodes[country.code] = path;
        buildLabel(country.code, country.label);
      } else {
        path.setAttribute("class", "background-country");
        countriesLayer.appendChild(path);
      }
    }
  }

  function bindPanZoom() {
    mapStage.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const point = svgPointFromEvent(event);
        const zoomFactor = Math.exp(-event.deltaY * 0.0015);
        zoomAt(point.x, point.y, viewState.scale * zoomFactor);
      },
      { passive: false },
    );

    mapStage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      const marketTarget = event.target.closest(".market-shape");
      viewState.dragging = true;
      viewState.pointerId = event.pointerId;
      viewState.dragStartX = event.clientX;
      viewState.dragStartY = event.clientY;
      viewState.dragOriginTx = viewState.tx;
      viewState.dragOriginTy = viewState.ty;
      viewState.moved = false;
      viewState.downTargetCode = marketTarget ? marketTarget.dataset.code : null;
      mapStage.classList.add("is-dragging");
      mapStage.setPointerCapture(event.pointerId);
    });

    mapStage.addEventListener("pointermove", (event) => {
      if (!viewState.dragging || event.pointerId !== viewState.pointerId) {
        return;
      }
      if ((event.buttons & 1) !== 1) {
        endDrag(event);
        return;
      }
      const deltaX = event.clientX - viewState.dragStartX;
      const deltaY = event.clientY - viewState.dragStartY;
      if (!viewState.moved) {
        const distance = Math.hypot(deltaX, deltaY);
        if (distance < viewState.dragThreshold) {
          return;
        }
        viewState.moved = true;
      }
      const rect = mapSvg.getBoundingClientRect();
      const scaleX = mapAsset.viewBox.width / rect.width;
      const scaleY = mapAsset.viewBox.height / rect.height;
      viewState.tx = viewState.dragOriginTx + deltaX * scaleX;
      viewState.ty = viewState.dragOriginTy + deltaY * scaleY;
      applyViewTransform();
    });

    function endDrag(event) {
      if (event.pointerId != null && event.pointerId !== viewState.pointerId) {
        return;
      }
      if (!viewState.moved && viewState.downTargetCode && marketNodes[viewState.downTargetCode]) {
        selectMarket(viewState.downTargetCode);
        render();
      } else if (!viewState.moved && state.market !== null) {
        state.market = null;
        render();
      }
      viewState.dragging = false;
      viewState.pointerId = null;
      viewState.downTargetCode = null;
      viewState.moved = false;
      mapStage.classList.remove("is-dragging");
      if (event.pointerId != null && mapStage.hasPointerCapture(event.pointerId)) {
        mapStage.releasePointerCapture(event.pointerId);
      }
    }

    mapStage.addEventListener("pointerup", endDrag);
    mapStage.addEventListener("pointercancel", endDrag);
    mapStage.addEventListener("pointerleave", endDrag);
  }

  function bindDismiss() {
    detailClose.addEventListener("click", (event) => {
      event.stopPropagation();
      state.market = null;
      render();
    });

    document.addEventListener("click", (event) => {
      if (state.market === null || mapPanel.contains(event.target)) {
        return;
      }
      state.market = null;
      render();
    });
  }

  function renderMap() {
    const markets = currentMarkets();
    const range = impactRange(markets);

    legendMin.textContent = `${formatNumber(range.min, 1)} €/MWh`;
    legendMax.textContent = `${formatNumber(range.max, 1)} €/MWh`;
    mapTitle.textContent = mapTitleForDriver(state.driver);

    Object.keys(data.markets).forEach((code) => {
      const market = markets[code];
      const available = Boolean(market && market.available && market.impact_per_1sigma_eur_per_mwh != null);
      if (!available) {
        marketNodes[code].style.setProperty("--market-fill", "#cbd5e1");
        marketNodes[code].classList.remove("is-selected");
        marketNodes[code].classList.add("is-unavailable");
        labelGroups[code].style.display = "none";
        return;
      }

      const fill = colorForValue(market.impact_per_1sigma_eur_per_mwh, range.min, range.max);
      const fg = textColorForValue(market.impact_per_1sigma_eur_per_mwh, range.min, range.max);
      marketNodes[code].style.setProperty("--market-fill", fill);
      marketNodes[code].classList.toggle("is-selected", code === state.market);
      marketNodes[code].classList.remove("is-unavailable");
      labelGroups[code].style.display = "";
      valueNodes[code].textContent = `${formatNumber(market.impact_per_1sigma_eur_per_mwh, 1)} €/MWh`;
      setLabelTheme(code, fg);
    });
  }

  function renderDetail() {
    if (!state.market) {
      detailOverlay.hidden = true;
      return;
    }
    const market = currentMarkets()[state.market];
    if (!market || !market.available) {
      detailOverlay.hidden = true;
      return;
    }
    detailOverlay.hidden = false;
    detailMarketName.textContent = market.name;
    detailPeriodDriver.textContent = `${data.periods[state.period].label} · ${data.drivers[state.driver].label}`;
    detailImpact.textContent = `${formatNumber(market.impact_per_1sigma_eur_per_mwh, 1)} €/MWh`;
    detailReferenceLabel.textContent = market.reference_label ?? "Reference";
    detailReferenceValue.textContent = market.reference_value_mw == null ? "n/a" : formatReferenceGw(market.reference_value_mw);
    if (market.spread_distortion_warning && market.warning_text) {
      detailWarning.hidden = false;
      detailWarningText.textContent = market.warning_text;
    } else {
      detailWarning.hidden = true;
      detailWarningText.textContent = "";
    }
  }

  function normalizeSelectedMarket() {
    if (state.market) {
      const market = currentMarkets()[state.market];
      if (!market || !market.available) {
        state.market = null;
      }
    }
  }

  function selectMarket(code) {
    const market = currentMarkets()[code];
    if (!market || !market.available) {
      state.market = null;
      return;
    }
    state.market = code;
  }

  function renderDriverButtons() {
    driverButtons.innerHTML = "";
    for (const driver of driverOrder) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "driver-button";
      button.textContent = data.drivers[driver].label;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(driver === state.driver));
      button.classList.toggle("is-active", driver === state.driver);
      button.addEventListener("click", () => {
        state.driver = driver;
        normalizeSelectedMarket();
        render();
      });
      driverButtons.appendChild(button);
    }
  }

  function renderPeriodOptions() {
    periodSelect.innerHTML = "";
    const seasonTypes = new Set(["winter", "spring", "summer", "autumn"]);
    const groups = {
      overview: [],
      years: [],
      seasons: [],
    };

    for (const period of periodEntries) {
      if (period.type === "all") {
        groups.overview.push(period);
      } else if (period.type === "year") {
        groups.years.push(period);
      } else if (seasonTypes.has(period.type)) {
        groups.seasons.push(period);
      }
    }

    for (const period of groups.overview) {
      const option = document.createElement("option");
      option.value = period.code;
      option.textContent = period.label;
      option.selected = period.code === state.period;
      periodSelect.appendChild(option);
    }

    for (const [label, periods] of [["Years", groups.years], ["Seasons", groups.seasons]]) {
      if (!periods.length) {
        continue;
      }
      const optgroup = document.createElement("optgroup");
      optgroup.label = label;
      for (const period of periods) {
        const option = document.createElement("option");
        option.value = period.code;
        option.textContent = period.label;
        option.selected = period.code === state.period;
        optgroup.appendChild(option);
      }
      periodSelect.appendChild(optgroup);
    }
    periodSelect.addEventListener("change", (event) => {
      state.period = event.target.value;
      normalizeSelectedMarket();
      render();
    });
  }

  function render() {
    renderDriverButtons();
    normalizeSelectedMarket();
    renderMap();
    renderDetail();
  }

  buildMap();
  bindPanZoom();
  bindDismiss();
  applyViewTransform();
  renderPeriodOptions();
  render();
})().catch((error) => {
  console.error(error);
});
