// Load D3 dynamically from local file
const d3Script = document.createElement("script");
d3Script.src = "d3.v7.min.js";
document.head.appendChild(d3Script);

d3Script.onload = () => {

  // Instant tooltip
  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "rgba(0,0,0,0.75)")
    .style("color", "white")
    .style("border-radius", "4px")
    .style("font-size", "14px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  window.render = function() {
    const entrants = +document.getElementById("entrants").value;
    const tieRatePercent = +document.getElementById("tie_rate").value;
    const day1TieRatePercent = +document.getElementById("day1_tie_rate").value;

    const { xs, ys, actualX, actualY } =
      computeCurve(entrants, tieRatePercent, day1TieRatePercent);

    document.getElementById("yhat_value").innerText =
      `${(actualY * 100).toFixed(0)}%`;

    d3.select("#plot").selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 10, right: 20, bottom: 50, left: 70 };

    const svg = d3.select("#plot")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("width", "100%")
      .style("height", "auto");

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([d3.min(xs), d3.max(xs)])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0])
      .nice();

    // Horizontal gridlines
    g.append("g")
      .call(
        d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat("")
      )
      .selectAll("line")
      .attr("stroke", "#ddd");

    // Vertical gridlines (canonical spacing)
    const logEnt = Math.log2(entrants);
    const ceilLog = Math.ceil(logEnt);

    const gridSpacingMap = {
      7: 10,
      8: 20,
      9: 50,
      10: 100,
      11: 200,
      12: 500
    };

    const gridSpacing = gridSpacingMap[ceilLog] || 10;

    const minX = d3.min(xs);
    const maxX = d3.max(xs);

    const xGridTicks = [];
    for (let v = Math.ceil(minX / gridSpacing) * gridSpacing; v <= maxX; v += gridSpacing) {
      xGridTicks.push(v);
    }

    const xGridAxis = g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickValues(xGridTicks)
          .tickSize(-innerHeight)
          .tickFormat("")
      );

    const [domainMin, domainMax] = xScale.domain();

    xGridAxis.selectAll("line")
      .attr("stroke", "#eee")
      .filter(d => d === domainMin || d === domainMax)
      .remove();

    // Tick spacing override for rounds 11 and 14
    const tickSpacingMap = {
      7: 5,
      8: 10,
      9: 25,
      10: 50,
      11: 100,
      12: 250
    };

    const tickSpacing = tickSpacingMap[ceilLog] || 10;

    const xTickVals = [];
    for (let v = Math.ceil(minX / tickSpacing) * tickSpacing; v <= maxX; v += tickSpacing) {
      xTickVals.push(v);
    }

    // Axes
    const xAxis = g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickValues(xTickVals)
      );

    xAxis.selectAll("text")
      .style("font-size", "14px");

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(10).tickFormat(d => d + "%"))
      .selectAll("text")
      .style("font-size", "14px");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Entrants");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("X-1-2 Cut Probability (%)");

    // Curve data
    const curveData = xs.map((x, i) => ({
      x: x,
      y: ys[i] * 100
    }));

    const lineGen = d3.line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y));

    // Curve path
    g.append("path")
      .datum(curveData)
      .attr("d", lineGen)
      .attr("stroke", "blue")
      .attr("stroke-width", 3)
      .attr("fill", "none")
      .style("pointer-events", "none");

    // Hover hit-circles
    g.selectAll(".curve-point")
      .data(curveData)
      .enter()
      .append("circle")
      .attr("class", "curve-point")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", 8)
      .attr("fill", "transparent")
      .style("pointer-events", "all")
      .on("mousemove", (ev, d) => {
        tooltip
          .style("opacity", 1)
          .style("left", (ev.pageX + 12) + "px")
          .style("top", (ev.pageY - 12) + "px")
          .text(`${d.x} Entrants: ${Math.round(d.y)}%`);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Draggable dot
    const dot = g.append("circle")
      .attr("cx", xScale(actualX))
      .attr("cy", yScale(actualY * 100))
      .attr("r", 8)
      .attr("fill", "red")
      .style("pointer-events", "all");

    dot.on("mousemove", (ev) => {
      tooltip
        .style("opacity", 1)
        .style("left", (ev.pageX + 12) + "px")
        .style("top", (ev.pageY - 12) + "px")
        .text(`${actualX} Entrants: ${Math.round(actualY * 100)}%`);
    }).on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

    // --- CLICK ANYWHERE MOVES DOT ---
    svg.on("mousedown", (ev) => {
      const bb = svg.node().getBoundingClientRect();

      const scale = width / bb.width;
      const svgPx = (ev.clientX - bb.left) * scale;

      const localPx = svgPx - margin.left;
      const clampedPx = Math.max(0, Math.min(innerWidth, localPx));

      const inverted = xScale.invert(clampedPx);
      const newEntrants = Math.round(inverted);
      const clampedEntrants = Math.max(d3.min(xs), Math.min(d3.max(xs), newEntrants));

      const logEnt2 = Math.log2(clampedEntrants);
      const ceilLog2 = Math.ceil(logEnt2);
      const tieRateFloat = +document.getElementById("tie_rate").value / 100;
      const day1TieRatePercent2 = +document.getElementById("day1_tie_rate").value;

      const delta2 = get_delta(ceilLog2, tieRateFloat, day1TieRatePercent2);
      const k2 = get_k(ceilLog2);

      const mantissa2 = logEnt2 - ceilLog2 + 1;
      const currentY = yhat(mantissa2, k2, delta2);

      dot.attr("cx", xScale(clampedEntrants));
      dot.attr("cy", yScale(currentY * 100));

      document.getElementById("yhat_value").innerText =
        `${Math.round(currentY * 100)}%`;

      tooltip
        .style("opacity", 1)
        .style("left", (ev.pageX + 12) + "px")
        .style("top", (ev.pageY - 12) + "px")
        .text(`${clampedEntrants} Entrants: ${Math.round(currentY * 100)}%`);

      document.getElementById("entrants").value = clampedEntrants;

      dragging = true;
    });

    // --- DRAG LOGIC ---
    let dragging = false;

    window.addEventListener("mousemove", (ev) => {
      if (!dragging) return;

      const bb = svg.node().getBoundingClientRect();

      const scale = width / bb.width;
      const svgPx = (ev.clientX - bb.left) * scale;

      const localPx = svgPx - margin.left;
      const clampedPx = Math.max(0, Math.min(innerWidth, localPx));

      const inverted = xScale.invert(clampedPx);
      const newEntrants = Math.round(inverted);
      const clampedEntrants = Math.max(d3.min(xs), Math.min(d3.max(xs), newEntrants));

      const logEnt2 = Math.log2(clampedEntrants);
      const ceilLog2 = Math.ceil(logEnt2);
      const tieRateFloat = +document.getElementById("tie_rate").value / 100;
      const day1TieRatePercent2 = +document.getElementById("day1_tie_rate").value;

      const delta2 = get_delta(ceilLog2, tieRateFloat, day1TieRatePercent2);
      const k2 = get_k(ceilLog2);

      const mantissa2 = logEnt2 - ceilLog2 + 1;
      const currentY = yhat(mantissa2, k2, delta2);

      dot.attr("cx", xScale(clampedEntrants));
      dot.attr("cy", yScale(currentY * 100));

      document.getElementById("yhat_value").innerText =
        `${Math.round(currentY * 100)}%`;

      tooltip
        .style("opacity", 1)
        .style("left", (ev.pageX + 12) + "px")
        .style("top", (ev.pageY - 12) + "px")
        .text(`${clampedEntrants} Entrants: ${Math.round(currentY * 100)}%`);

      document.getElementById("entrants").value = clampedEntrants;
    });

    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;

      tooltip.style("opacity", 0);

      if (window.updateFromEntrants) {
        window.updateFromEntrants();
      } else if (window.render) {
        window.render();
      }
    });
  };

  if (window.render) {
    window.render();
  }
};
