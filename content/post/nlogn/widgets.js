(function () {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    // Shared datasets: n = 8 is identical across Interactive 1 and Interactive 2.
    const DATASETS = {
        4: [457, 118, 720, 329],
        8: [329, 457, 657, 839, 436, 720, 355, 118],
        16: [329, 457, 657, 839, 436, 720, 355, 118, 512, 904, 241, 615, 784, 192, 488, 273]
    };

    const STAGE_W = 680;
    const Y_INPUT = 38;
    const Y_SLOT = 342;

    function svgEl(tag, attrs, text) {
        const el = document.createElementNS(SVG_NS, tag);
        if (attrs) {
            for (const key in attrs) {
                if (Object.prototype.hasOwnProperty.call(attrs, key)) {
                    el.setAttribute(key, String(attrs[key]));
                }
            }
        }
        if (text !== undefined && text !== null) {
            el.textContent = String(text);
        }
        return el;
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function cubicBezierPoint(p0, p1, p2, p3, t) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;
        return {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
        };
    }

    function edgeBezierControls(x1, y1, x2, y2) {
        const ym = y1 + (y2 - y1) * 0.52;
        return [
            { x: x1, y: y1 },
            { x: x1, y: ym },
            { x: x2, y: ym },
            { x: x2, y: y2 }
        ];
    }

    function edgePathD(x1, y1, x2, y2) {
        const [p0, p1, p2, p3] = edgeBezierControls(x1, y1, x2, y2);
        return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}, ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`;
    }

    function computeRowCenters(count, marginX) {
        const usable = STAGE_W - 2 * marginX;
        if (count === 1) return [STAGE_W / 2];
        const step = usable / (count - 1);
        const xs = [];
        for (let i = 0; i < count; i++) {
            xs.push(marginX + i * step);
        }
        return xs;
    }

    function chipDimensions(n) {
        if (n <= 4) return { w: 58, h: 28, fontSize: 12, marginX: 118 };
        if (n <= 8) return { w: 52, h: 28, fontSize: 11.5, marginX: 64 };
        return { w: 36, h: 24, fontSize: 10, marginX: 34 };
    }

    // -------------------------------------------------------------------------
    // Graph Builder 1: Balanced 2-Way Comparison Tree (Interactive 1)
    // -------------------------------------------------------------------------
    function buildBinaryTreeModel(items) {
        const n = items.length;
        const depth = Math.round(Math.log2(n));
        const sorted = items.slice().sort((a, b) => a - b);
        const dims = chipDimensions(n);
        const slotXs = computeRowCenters(n, dims.marginX);
        const inputXs = computeRowCenters(n, dims.marginX);

        const inputs = items.map((val, idx) => ({
            index: idx,
            value: val,
            x: inputXs[idx],
            y: Y_INPUT,
            w: dims.w,
            h: dims.h,
            fontSize: dims.fontSize
        }));

        const slots = sorted.map((val, idx) => ({
            index: idx,
            value: val,
            x: slotXs[idx],
            y: Y_SLOT,
            w: dims.w,
            h: dims.h,
            fontSize: dims.fontSize
        }));

        const levelYsByDepth = {
            2: [122, 226],
            3: [104, 180, 256],
            4: [96, 152, 208, 264]
        };
        const levelYs = levelYsByDepth[depth] || [104, 180, 256];

        const nodeW = n === 16 ? 38 : 48;
        const nodeH = n === 16 ? 21 : 24;
        const nodeFont = n === 16 ? 9.5 : 10.5;

        const nodes = [];
        const edges = [];
        const nodeMap = {};

        function buildSubtree(lo, hi, level, id) {
            const mid = Math.floor((lo + hi) / 2);
            const pivot = Math.floor((sorted[mid] + sorted[mid + 1]) / 2);
            const x = (slotXs[lo] + slotXs[hi]) / 2;
            const y = levelYs[level];
            const node = {
                id: id,
                x: x,
                y: y,
                w: nodeW,
                h: nodeH,
                rx: 11,
                label: String(pivot),
                fontSize: nodeFont,
                pivot: pivot,
                lo: lo,
                hi: hi,
                mid: mid,
                level: level
            };
            nodes.push(node);
            nodeMap[id] = node;

            // Left child
            const leftIsLeaf = lo === mid;
            const leftTargetId = leftIsLeaf ? `slot-${lo}` : `${id}L`;
            const leftX = leftIsLeaf ? slotXs[lo] : (slotXs[lo] + slotXs[mid]) / 2;
            const leftY = leftIsLeaf ? Y_SLOT - dims.h / 2 : levelYs[level + 1] - nodeH / 2;
            const leftEdgeId = `${id}->${leftTargetId}`;
            const leftCtrl = edgeBezierControls(x, y + nodeH / 2, leftX, leftY);
            const leftLblPt = cubicBezierPoint(leftCtrl[0], leftCtrl[1], leftCtrl[2], leftCtrl[3], 0.42);
            edges.push({
                id: leftEdgeId,
                x1: x,
                y1: y + nodeH / 2,
                x2: leftX,
                y2: leftY,
                label: "<",
                labelX: leftLblPt.x - (n === 16 && level >= 2 ? 7 : 10),
                labelY: leftLblPt.y - 2
            });
            if (!leftIsLeaf) {
                buildSubtree(lo, mid, level + 1, leftTargetId);
            }

            // Right child
            const rightIsLeaf = mid + 1 === hi;
            const rightTargetId = rightIsLeaf ? `slot-${hi}` : `${id}R`;
            const rightX = rightIsLeaf ? slotXs[hi] : (slotXs[mid + 1] + slotXs[hi]) / 2;
            const rightY = rightIsLeaf ? Y_SLOT - dims.h / 2 : levelYs[level + 1] - nodeH / 2;
            const rightEdgeId = `${id}->${rightTargetId}`;
            const rightCtrl = edgeBezierControls(x, y + nodeH / 2, rightX, rightY);
            const rightLblPt = cubicBezierPoint(rightCtrl[0], rightCtrl[1], rightCtrl[2], rightCtrl[3], 0.42);
            edges.push({
                id: rightEdgeId,
                x1: x,
                y1: y + nodeH / 2,
                x2: rightX,
                y2: rightY,
                label: ">",
                labelX: rightLblPt.x + (n === 16 && level >= 2 ? 7 : 10),
                labelY: rightLblPt.y - 2
            });
            if (!rightIsLeaf) {
                buildSubtree(mid + 1, hi, level + 1, rightTargetId);
            }
        }

        buildSubtree(0, n - 1, 0, "N");

        function planForItem(itemIndex) {
            const val = items[itemIndex];
            const inp = inputs[itemIndex];
            const root = nodeMap["N"];
            const segments = [];

            // Lift from input chip to root
            segments.push({
                fromPt: { x: inp.x, y: inp.y },
                toPt: { x: root.x, y: root.y },
                edgeId: null,
                nodeId: root.id,
                countsStep: false,
                highlightDigit: -1,
                duration: 280,
                narration: `Routing <strong>${val}</strong> into the 2-way tree root.`
            });

            let curId = "N";
            let targetSlotIndex = 0;

            while (true) {
                const node = nodeMap[curId];
                const goLeft = val < node.pivot;
                const isLeaf = goLeft ? node.lo === node.mid : node.mid + 1 === node.hi;
                const nextId = isLeaf
                    ? `slot-${goLeft ? node.lo : node.hi}`
                    : `${curId}${goLeft ? "L" : "R"}`;
                const edgeId = `${curId}->${nextId}`;
                const dirSymbol = goLeft ? "&lt;" : "&gt;";
                const dirWord = goLeft ? "left" : "right";

                if (isLeaf) {
                    targetSlotIndex = goLeft ? node.lo : node.hi;
                    const slot = slots[targetSlotIndex];
                    segments.push({
                        fromPt: { x: node.x, y: node.y + node.h / 2 },
                        toPt: { x: slot.x, y: slot.y },
                        edgeId: edgeId,
                        nodeId: node.id,
                        countsStep: true,
                        highlightDigit: -1,
                        duration: 340,
                        narration: `<strong>${val} ${dirSymbol} ${node.pivot}</strong> &rarr; branch ${dirWord} into sorted slot <strong>#${targetSlotIndex}</strong>.`
                    });
                    break;
                } else {
                    const nextNode = nodeMap[nextId];
                    segments.push({
                        fromPt: { x: node.x, y: node.y + node.h / 2 },
                        toPt: { x: nextNode.x, y: nextNode.y },
                        edgeId: edgeId,
                        nodeId: nextNode.id,
                        countsStep: true,
                        highlightDigit: -1,
                        duration: 340,
                        narration: `<strong>${val} ${dirSymbol} ${node.pivot}</strong> &rarr; go ${dirWord} (1 bit gained).`
                    });
                    curId = nextId;
                }
            }

            return {
                itemIndex: itemIndex,
                value: val,
                targetSlotIndex: targetSlotIndex,
                expectedSteps: depth,
                segments: segments
            };
        }

        return {
            inputs: inputs,
            slots: slots,
            nodes: nodes,
            edges: edges,
            totalExpectedSteps: n * depth,
            depth: depth,
            branchingLabel: "2",
            bitsLabel: "1 bit / step",
            depthFormula: `log₂(${n}) = ${depth}`,
            totalSub: `n · log₂ n = ${n * depth}`,
            planForItem: planForItem
        };
    }

    // -------------------------------------------------------------------------
    // Graph Builder 2A: 10-Way Digit Trie / MSD Radix Sort (Interactive 2)
    // -------------------------------------------------------------------------
    function buildRadixTreeModel(items) {
        const n = items.length;
        const sorted = items.slice().sort((a, b) => a - b);
        const dims = chipDimensions(n);
        const slotXs = computeRowCenters(n, dims.marginX);
        const inputXs = computeRowCenters(n, dims.marginX);

        const inputs = items.map((val, idx) => ({
            index: idx,
            value: val,
            x: inputXs[idx],
            y: Y_INPUT,
            w: dims.w,
            h: dims.h,
            fontSize: dims.fontSize
        }));

        const slots = sorted.map((val, idx) => ({
            index: idx,
            value: val,
            x: slotXs[idx],
            y: Y_SLOT,
            w: dims.w,
            h: dims.h,
            fontSize: dims.fontSize
        }));

        const slotIndexByVal = {};
        sorted.forEach((v, i) => {
            slotIndexByVal[v] = i;
        });

        // Group items by hundreds digit (0..9)
        const buckets = Array.from({ length: 10 }, () => []);
        sorted.forEach((val) => {
            const h = Math.floor(val / 100);
            buckets[h].push(val);
        });

        const nodes = [];
        const edges = [];

        const rootX = STAGE_W / 2;
        const rootY = 104;
        const rootW = 136;
        const rootH = 28;
        nodes.push({
            id: "R",
            x: rootX,
            y: rootY,
            w: rootW,
            h: rootH,
            rx: 14,
            label: "hundreds (0–9)",
            fontSize: 10.5
        });

        const digitXs = computeRowCenters(10, 52);
        const yHundreds = 186;
        const yTens = 264;
        const dSize = 26;

        const bucketInfo = {};

        for (let d = 0; d < 10; d++) {
            const members = buckets[d];
            const isEmpty = members.length === 0;
            const dId = `H${d}`;
            const dx = digitXs[d];

            nodes.push({
                id: dId,
                x: dx,
                y: yHundreds,
                w: dSize,
                h: dSize,
                rx: 13,
                label: String(d),
                fontSize: 11,
                muted: isEmpty
            });

            edges.push({
                id: `R->${dId}`,
                x1: rootX,
                y1: rootY + rootH / 2,
                x2: dx,
                y2: yHundreds - dSize / 2,
                muted: isEmpty
            });

            if (members.length === 1) {
                const val = members[0];
                const sIdx = slotIndexByVal[val];
                const slot = slots[sIdx];
                edges.push({
                    id: `${dId}->slot-${sIdx}`,
                    x1: dx,
                    y1: yHundreds + dSize / 2,
                    x2: slot.x,
                    y2: Y_SLOT - dims.h / 2
                });
                bucketInfo[d] = { expanded: false, x: dx, y: yHundreds };
            } else if (members.length > 1) {
                const tensNodes = {};
                members.forEach((val) => {
                    const t = Math.floor((val % 100) / 10);
                    const sIdx = slotIndexByVal[val];
                    const slot = slots[sIdx];
                    const tId = `T${d}_${t}`;
                    // Place tens node right above its sorted slot so there are zero edge crossings
                    const tx = slot.x;
                    nodes.push({
                        id: tId,
                        x: tx,
                        y: yTens,
                        w: 40,
                        h: 22,
                        rx: 11,
                        label: `_${t}_`,
                        fontSize: 10
                    });
                    edges.push({
                        id: `${dId}->${tId}`,
                        x1: dx,
                        y1: yHundreds + dSize / 2,
                        x2: tx,
                        y2: yTens - 11
                    });
                    edges.push({
                        id: `${tId}->slot-${sIdx}`,
                        x1: tx,
                        y1: yTens + 11,
                        x2: slot.x,
                        y2: Y_SLOT - dims.h / 2
                    });
                    tensNodes[t] = { id: tId, x: tx, y: yTens };
                });
                bucketInfo[d] = { expanded: true, x: dx, y: yHundreds, tensNodes: tensNodes };
            }
        }

        const totalExpectedSteps = items.reduce((acc, val) => {
            const h = Math.floor(val / 100);
            return acc + (buckets[h].length > 1 ? 2 : 1);
        }, 0);

        function planForItem(itemIndex) {
            const val = items[itemIndex];
            const inp = inputs[itemIndex];
            const h = Math.floor(val / 100);
            const t = Math.floor((val % 100) / 10);
            const sIdx = slotIndexByVal[val];
            const slot = slots[sIdx];
            const b = bucketInfo[h];
            const hId = `H${h}`;
            const segments = [];

            // Lift into root
            segments.push({
                fromPt: { x: inp.x, y: inp.y },
                toPt: { x: rootX, y: rootY },
                edgeId: null,
                nodeId: "R",
                countsStep: false,
                highlightDigit: 0,
                duration: 260,
                narration: `Reading hundreds digit of <strong>${val}</strong> (no comparisons against other items).`
            });

            // Jump to hundreds digit branch
            segments.push({
                fromPt: { x: rootX, y: rootY + rootH / 2 },
                toPt: { x: b.x, y: b.y },
                edgeId: `R->${hId}`,
                nodeId: hId,
                countsStep: true,
                highlightDigit: 0,
                duration: 340,
                narration: `Hundreds digit is <strong>${h}</strong> &rarr; jump straight to branch <strong>${h}</strong> (3.32 bits in 1 step).`
            });

            if (!b.expanded) {
                segments.push({
                    fromPt: { x: b.x, y: b.y + dSize / 2 },
                    toPt: { x: slot.x, y: slot.y },
                    edgeId: `${hId}->slot-${sIdx}`,
                    nodeId: hId,
                    countsStep: false,
                    highlightDigit: -1,
                    duration: 310,
                    narration: `Only 1 item in branch <strong>${h}</strong> &rarr; <strong>${val}</strong> lands in slot <strong>#${sIdx}</strong>.`
                });
            } else {
                const tn = b.tensNodes[t];
                segments.push({
                    fromPt: { x: b.x, y: b.y + dSize / 2 },
                    toPt: { x: tn.x, y: tn.y },
                    edgeId: `${hId}->${tn.id}`,
                    nodeId: tn.id,
                    countsStep: true,
                    highlightDigit: 1,
                    duration: 340,
                    narration: `Branch <strong>${h}</strong> has multiple items &rarr; read tens digit <strong>${t}</strong> (0 comparisons).`
                });
                segments.push({
                    fromPt: { x: tn.x, y: tn.y + 11 },
                    toPt: { x: slot.x, y: slot.y },
                    edgeId: `${tn.id}->slot-${sIdx}`,
                    nodeId: tn.id,
                    countsStep: false,
                    highlightDigit: -1,
                    duration: 260,
                    narration: `Prefix <strong>${h}${t}_</strong> is unique &rarr; <strong>${val}</strong> lands in slot <strong>#${sIdx}</strong>.`
                });
            }

            return {
                itemIndex: itemIndex,
                value: val,
                targetSlotIndex: sIdx,
                expectedSteps: b.expanded ? 2 : 1,
                segments: segments
            };
        }

        return {
            inputs: inputs,
            slots: slots,
            nodes: nodes,
            edges: edges,
            totalExpectedSteps: totalExpectedSteps,
            branchingLabel: "10",
            bitsLabel: "3.32 bits / step",
            compSub: "digit lookup only",
            totalSub: "linear in n (vs 24)",
            planForItem: planForItem
        };
    }

    // -------------------------------------------------------------------------
    // Graph Builder 2B: n-Way Direct Index (Interactive 2, Direct Bucket mode)
    // -------------------------------------------------------------------------
    function buildDirectIndexModel(items) {
        const n = items.length;
        const sorted = items.slice().sort((a, b) => a - b);
        const dims = chipDimensions(n);
        const slotXs = computeRowCenters(n, dims.marginX);
        const inputXs = computeRowCenters(n, dims.marginX);

        const inputs = items.map((val, idx) => ({
            index: idx,
            value: val,
            x: inputXs[idx],
            y: Y_INPUT,
            w: dims.w,
            h: dims.h,
            fontSize: dims.fontSize
        }));

        const slots = sorted.map((val, idx) => ({
            index: idx,
            value: val,
            x: slotXs[idx],
            y: Y_SLOT,
            w: dims.w,
            h: dims.h,
            fontSize: dims.fontSize
        }));

        const slotIndexByVal = {};
        sorted.forEach((v, i) => {
            slotIndexByVal[v] = i;
        });

        const rootX = STAGE_W / 2;
        const rootY = 160;
        const rootW = 196;
        const rootH = 34;

        const nodes = [
            {
                id: "D",
                x: rootX,
                y: rootY,
                w: rootW,
                h: rootH,
                rx: 17,
                label: `direct bucket (${n}-way · depth 1)`,
                fontSize: 10.5
            }
        ];

        const edges = slots.map((slot) => ({
            id: `D->slot-${slot.index}`,
            x1: rootX,
            y1: rootY + rootH / 2,
            x2: slot.x,
            y2: Y_SLOT - dims.h / 2
        }));

        function planForItem(itemIndex) {
            const val = items[itemIndex];
            const inp = inputs[itemIndex];
            const sIdx = slotIndexByVal[val];
            const slot = slots[sIdx];

            return {
                itemIndex: itemIndex,
                value: val,
                targetSlotIndex: sIdx,
                expectedSteps: 1,
                segments: [
                    {
                        fromPt: { x: inp.x, y: inp.y },
                        toPt: { x: rootX, y: rootY },
                        edgeId: null,
                        nodeId: "D",
                        countsStep: false,
                        highlightDigit: -1,
                        duration: 240,
                        narration: `Mapping <strong>${val}</strong> directly to its address (depth 1).`
                    },
                    {
                        fromPt: { x: rootX, y: rootY + rootH / 2 },
                        toPt: { x: slot.x, y: slot.y },
                        edgeId: `D->slot-${sIdx}`,
                        nodeId: "D",
                        countsStep: true,
                        highlightDigit: -1,
                        duration: 380,
                        narration: `Direct ${n}-way jump &rarr; <strong>${val}</strong> lands in slot <strong>#${sIdx}</strong> in 1 step (log₂ ${n} = ${Math.log2(n).toFixed(0)} bits).`
                    }
                ]
            };
        }

        return {
            inputs: inputs,
            slots: slots,
            nodes: nodes,
            edges: edges,
            totalExpectedSteps: n,
            branchingLabel: `n = ${n}`,
            bitsLabel: `${Math.log2(n).toFixed(2)} bits / step`,
            compSub: "direct address jump",
            totalSub: `exact O(n) = ${n} (vs 24)`,
            planForItem: planForItem
        };
    }

    // -------------------------------------------------------------------------
    // Shared Tree Routing Controller (used identically by Interactive 1 & 2)
    // -------------------------------------------------------------------------
    function createTreeWidget(container, config) {
        const svg = container.querySelector("svg");
        const btnStep = container.querySelector('[data-action="step"]');
        const btnPlay = container.querySelector('[data-action="play"]');
        const btnReset = container.querySelector('[data-action="reset"]');
        const statusEl = container.querySelector('[data-role="status"]');
        const progressEl = container.querySelector('[data-role="progress"]');

        const statBranch = container.querySelector('[data-stat="branch"]');
        const statBits = container.querySelector('[data-stat="bits"]');
        const statDepth = container.querySelector('[data-stat="depth"]');
        const statDepthFormula = container.querySelector('[data-stat="depth-formula"]');
        const statCompSub = container.querySelector('[data-stat="comp-sub"]');
        const statItemSteps = container.querySelector('[data-stat="item-steps"]');
        const statItemSub = container.querySelector('[data-stat="item-sub"]');
        const statTotalSteps = container.querySelector('[data-stat="total-steps"]');
        const statTotalSub = container.querySelector('[data-stat="total-sub"]');

        const state = {
            model: null,
            nextIndex: 0,
            totalSteps: 0,
            currentItemSteps: 0,
            settledSlots: new Set(),
            visitedEdges: new Set(),
            isAnimating: false,
            isPlaying: false,
            rafId: null,
            playTimer: null,
            currentPlan: null
        };

        let refs = {};

        function setStatus(html) {
            const span = statusEl.querySelector("span:first-child");
            if (span) span.innerHTML = html;
            if (progressEl && state.model) {
                progressEl.textContent = `${state.settledSlots.size} / ${state.model.inputs.length} routed`;
            }
        }

        function updateStats(activeItemVal) {
            const m = state.model;
            if (statBranch) statBranch.textContent = m.branchingLabel;
            if (statBits) statBits.textContent = m.bitsLabel;
            if (statDepth && m.depth !== undefined) statDepth.textContent = String(m.depth);
            if (statDepthFormula && m.depthFormula) statDepthFormula.textContent = m.depthFormula;
            if (statCompSub && m.compSub) statCompSub.textContent = m.compSub;
            if (statItemSteps) statItemSteps.textContent = String(state.currentItemSteps);
            if (statItemSub) {
                statItemSub.textContent = activeItemVal !== undefined ? `for ${activeItemVal}` : "waiting";
            }
            if (statTotalSteps) {
                statTotalSteps.textContent = `${state.totalSteps} / ${m.totalExpectedSteps}`;
            }
            if (statTotalSub && m.totalSub) statTotalSub.textContent = m.totalSub;
        }

        function renderStage() {
            const m = state.model;
            while (svg.firstChild) svg.removeChild(svg.firstChild);

            refs = {
                edges: {},
                edgeLabels: {},
                nodes: {},
                inputs: {},
                slots: {},
                tokenGroup: null,
                tokenRect: null,
                tokenText: null
            };

            // Layer 1: Band labels
            const labelsG = svgEl("g", { class: "nw-layer-labels" });
            labelsG.appendChild(svgEl("text", { x: 14, y: 15, class: "nw-band-label" }, "Unsorted Input"));
            labelsG.appendChild(svgEl("text", { x: 14, y: 78, class: "nw-band-label" }, "Routing Tree"));
            labelsG.appendChild(svgEl("text", { x: 14, y: 316, class: "nw-band-label" }, "Sorted Output"));
            svg.appendChild(labelsG);

            // Layer 2: Edges
            const edgesG = svgEl("g", { class: "nw-layer-edges" });
            m.edges.forEach((e) => {
                const path = svgEl("path", {
                    d: edgePathD(e.x1, e.y1, e.x2, e.y2),
                    class: e.muted ? "nw-edge is-muted" : "nw-edge"
                });
                edgesG.appendChild(path);
                refs.edges[e.id] = path;

                if (e.label) {
                    const lbl = svgEl("text", {
                        x: e.labelX.toFixed(1),
                        y: e.labelY.toFixed(1),
                        class: "nw-edge-label"
                    }, e.label);
                    edgesG.appendChild(lbl);
                    refs.edgeLabels[e.id] = lbl;
                }
            });
            svg.appendChild(edgesG);

            // Layer 3: Tree nodes
            const nodesG = svgEl("g", { class: "nw-layer-nodes" });
            m.nodes.forEach((nd) => {
                const g = svgEl("g", { class: "nw-node" });
                const rect = svgEl("rect", {
                    x: (nd.x - nd.w / 2).toFixed(1),
                    y: (nd.y - nd.h / 2).toFixed(1),
                    width: nd.w,
                    height: nd.h,
                    rx: nd.rx || 10,
                    class: nd.muted ? "nw-node-rect is-muted" : "nw-node-rect"
                });
                const text = svgEl("text", {
                    x: nd.x.toFixed(1),
                    y: nd.y.toFixed(1),
                    class: nd.muted ? "nw-node-text is-muted" : "nw-node-text",
                    style: nd.fontSize ? `font-size: ${nd.fontSize}px` : ""
                }, nd.label);
                g.appendChild(rect);
                g.appendChild(text);
                nodesG.appendChild(g);
                refs.nodes[nd.id] = { group: g, rect: rect, text: text };
            });
            svg.appendChild(nodesG);

            // Layer 4: Unsorted input chips
            const inputsG = svgEl("g", { class: "nw-layer-inputs" });
            m.inputs.forEach((inp) => {
                const g = svgEl("g", { class: "nw-input-chip" });
                g.appendChild(svgEl("rect", {
                    x: (inp.x - inp.w / 2).toFixed(1),
                    y: (inp.y - inp.h / 2).toFixed(1),
                    width: inp.w,
                    height: inp.h,
                    rx: 7
                }));
                g.appendChild(svgEl("text", {
                    x: inp.x.toFixed(1),
                    y: inp.y.toFixed(1),
                    style: `font-size: ${inp.fontSize}px`
                }, String(inp.value)));
                inputsG.appendChild(g);
                refs.inputs[inp.index] = g;
            });
            svg.appendChild(inputsG);

            // Layer 5: Sorted output slots
            const slotsG = svgEl("g", { class: "nw-layer-slots" });
            m.slots.forEach((slot) => {
                const g = svgEl("g", { class: "nw-slot" });
                g.appendChild(svgEl("rect", {
                    x: (slot.x - slot.w / 2).toFixed(1),
                    y: (slot.y - slot.h / 2).toFixed(1),
                    width: slot.w,
                    height: slot.h,
                    rx: 7
                }));
                const valText = svgEl("text", {
                    x: slot.x.toFixed(1),
                    y: slot.y.toFixed(1),
                    class: "nw-slot-val",
                    style: `font-size: ${slot.fontSize}px`
                }, "");
                const idxText = svgEl("text", {
                    x: slot.x.toFixed(1),
                    y: (slot.y + slot.h / 2 + 13).toFixed(1),
                    class: "nw-slot-idx"
                }, `[${slot.index}]`);
                g.appendChild(valText);
                g.appendChild(idxText);
                slotsG.appendChild(g);
                refs.slots[slot.index] = { group: g, valText: valText };
            });
            svg.appendChild(slotsG);

            // Layer 6: Animated token (topmost)
            const tokenG = svgEl("g", { class: "nw-token", style: "display: none;" });
            const tokenW = m.inputs.length === 16 ? 40 : 52;
            const tokenH = m.inputs.length === 16 ? 24 : 28;
            const tokenRect = svgEl("rect", {
                x: -tokenW / 2,
                y: -tokenH / 2,
                width: tokenW,
                height: tokenH,
                rx: 8,
                class: "nw-token-pill"
            });
            const tokenText = svgEl("text", {
                x: 0,
                y: 0,
                class: "nw-token-text",
                style: m.inputs.length === 16 ? "font-size: 10.5px" : ""
            });
            tokenG.appendChild(tokenRect);
            tokenG.appendChild(tokenText);
            svg.appendChild(tokenG);

            refs.tokenGroup = tokenG;
            refs.tokenRect = tokenRect;
            refs.tokenText = tokenText;
        }

        function setTokenLabel(val, highlightDigit) {
            const t = refs.tokenText;
            while (t.firstChild) t.removeChild(t.firstChild);
            const str = String(val).padStart(3, "0");
            if (highlightDigit < 0 || highlightDigit > 2) {
                t.textContent = String(val);
                return;
            }
            for (let i = 0; i < str.length; i++) {
                const span = svgEl("tspan", {
                    class: i === highlightDigit ? "nw-token-digit-hi" : "nw-token-digit-dim"
                }, str[i]);
                t.appendChild(span);
            }
        }

        function clearActiveHighlights() {
            Object.keys(refs.edges).forEach((id) => {
                const el = refs.edges[id];
                el.classList.remove("is-active");
                if (state.visitedEdges.has(id)) {
                    el.classList.add("is-visited");
                }
            });
            Object.keys(refs.edgeLabels).forEach((id) => {
                refs.edgeLabels[id].classList.remove("is-active");
            });
            Object.keys(refs.nodes).forEach((id) => {
                refs.nodes[id].rect.classList.remove("is-active");
            });
            Object.keys(refs.slots).forEach((idx) => {
                refs.slots[idx].group.classList.remove("is-just-landed");
            });
        }

        function stopPlayback() {
            state.isPlaying = false;
            if (state.playTimer) {
                clearTimeout(state.playTimer);
                state.playTimer = null;
            }
            if (btnPlay) btnPlay.textContent = "Play";
        }

        function finishCurrentPlanImmediately() {
            if (!state.isAnimating || !state.currentPlan) return;
            if (state.rafId) {
                cancelAnimationFrame(state.rafId);
                state.rafId = null;
            }
            const plan = state.currentPlan;
            const remainingSteps = plan.expectedSteps - state.currentItemSteps;
            if (remainingSteps > 0) {
                state.currentItemSteps += remainingSteps;
                state.totalSteps += remainingSteps;
            }
            plan.segments.forEach((seg) => {
                if (seg.edgeId) state.visitedEdges.add(seg.edgeId);
            });
            completeItemLanding(plan);
        }

        function completeItemLanding(plan) {
            state.isAnimating = false;
            state.currentPlan = null;
            refs.tokenGroup.style.display = "none";

            clearActiveHighlights();

            const inpEl = refs.inputs[plan.itemIndex];
            if (inpEl) {
                inpEl.classList.remove("is-current");
                inpEl.classList.add("is-done");
            }

            state.settledSlots.add(plan.targetSlotIndex);
            const slotRef = refs.slots[plan.targetSlotIndex];
            if (slotRef) {
                slotRef.valText.textContent = String(plan.value);
                slotRef.group.classList.add("is-filled", "is-just-landed");
            }

            state.nextIndex = plan.itemIndex + 1;
            updateStats(plan.value);

            const allDone = state.nextIndex >= state.model.inputs.length;
            if (allDone) {
                stopPlayback();
                setStatus(`All <strong>${state.model.inputs.length}</strong> items sorted in <strong>${state.totalSteps}</strong> total steps.`);
                if (btnStep) btnStep.disabled = true;
                if (btnPlay) btnPlay.disabled = true;
            } else {
                setStatus(`<strong>${plan.value}</strong> settled in slot <strong>#${plan.targetSlotIndex}</strong> (${plan.expectedSteps} ${plan.expectedSteps === 1 ? "step" : "steps"}).`);
                if (state.isPlaying) {
                    state.playTimer = setTimeout(() => {
                        if (state.isPlaying) stepNextItem();
                    }, 260);
                }
            }
        }

        function stepNextItem() {
            if (state.isAnimating) {
                finishCurrentPlanImmediately();
            }
            if (state.nextIndex >= state.model.inputs.length) {
                stopPlayback();
                return;
            }

            const plan = state.model.planForItem(state.nextIndex);
            state.currentPlan = plan;
            state.isAnimating = true;
            state.currentItemSteps = 0;

            clearActiveHighlights();
            const inpEl = refs.inputs[plan.itemIndex];
            if (inpEl) inpEl.classList.add("is-current");

            refs.tokenGroup.style.display = "";
            updateStats(plan.value);

            let segIdx = 0;

            function runSegment() {
                if (segIdx >= plan.segments.length) {
                    completeItemLanding(plan);
                    return;
                }

                const seg = plan.segments[segIdx];
                setTokenLabel(plan.value, seg.highlightDigit);
                setStatus(seg.narration);

                if (seg.countsStep) {
                    state.currentItemSteps += 1;
                    state.totalSteps += 1;
                    updateStats(plan.value);
                }

                if (seg.edgeId && refs.edges[seg.edgeId]) {
                    refs.edges[seg.edgeId].classList.add("is-active");
                    state.visitedEdges.add(seg.edgeId);
                }
                if (seg.edgeId && refs.edgeLabels[seg.edgeId]) {
                    refs.edgeLabels[seg.edgeId].classList.add("is-active");
                }
                if (seg.nodeId && refs.nodes[seg.nodeId]) {
                    refs.nodes[seg.nodeId].rect.classList.add("is-active");
                }

                const ctrl = seg.edgeId
                    ? edgeBezierControls(seg.fromPt.x, seg.fromPt.y, seg.toPt.x, seg.toPt.y)
                    : null;

                const startTime = performance.now();

                function frame(now) {
                    const rawT = Math.min(1, (now - startTime) / seg.duration);
                    const t = easeInOutCubic(rawT);
                    let pt;
                    if (ctrl) {
                        pt = cubicBezierPoint(ctrl[0], ctrl[1], ctrl[2], ctrl[3], t);
                    } else {
                        pt = {
                            x: seg.fromPt.x + (seg.toPt.x - seg.fromPt.x) * t,
                            y: seg.fromPt.y + (seg.toPt.y - seg.fromPt.y) * t
                        };
                    }
                    refs.tokenGroup.setAttribute("transform", `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);

                    if (rawT < 1) {
                        state.rafId = requestAnimationFrame(frame);
                    } else {
                        segIdx += 1;
                        runSegment();
                    }
                }

                state.rafId = requestAnimationFrame(frame);
            }

            runSegment();
        }

        function reset(rebuildModel) {
            stopPlayback();
            if (state.rafId) {
                cancelAnimationFrame(state.rafId);
                state.rafId = null;
            }
            state.isAnimating = false;
            state.currentPlan = null;
            state.nextIndex = 0;
            state.totalSteps = 0;
            state.currentItemSteps = 0;
            state.settledSlots = new Set();
            state.visitedEdges = new Set();

            if (rebuildModel || !state.model) {
                state.model = config.buildModel();
            }

            renderStage();
            updateStats();
            setStatus(config.idleMessage());
            if (btnStep) btnStep.disabled = false;
            if (btnPlay) btnPlay.disabled = false;
        }

        btnStep.addEventListener("click", () => {
            stopPlayback();
            stepNextItem();
        });

        btnPlay.addEventListener("click", () => {
            if (state.isPlaying) {
                stopPlayback();
                return;
            }
            if (state.nextIndex >= state.model.inputs.length) {
                reset(false);
            }
            state.isPlaying = true;
            btnPlay.textContent = "Pause";
            if (!state.isAnimating) {
                stepNextItem();
            }
        });

        btnReset.addEventListener("click", () => {
            reset(false);
        });

        reset(true);

        return {
            rebuild: () => reset(true)
        };
    }

    // -------------------------------------------------------------------------
    // Initialize Interactive 1: The 2-Way Tree
    // -------------------------------------------------------------------------
    function initBinaryTreeWidget(container) {
        const nOptions = [4, 8, 16];
        const slider = container.querySelector('[data-role="n-slider"]');
        const nValEl = container.querySelector('[data-role="n-val"]');

        let currentN = nOptions[parseInt(slider.value, 10)] || 8;

        const ctrl = createTreeWidget(container, {
            buildModel: () => buildBinaryTreeModel(DATASETS[currentN]),
            idleMessage: () =>
                `Click <strong>Step Item</strong> or <strong>Play</strong> to route ${currentN} items down a depth-${Math.round(Math.log2(currentN))} binary tree.`
        });

        slider.addEventListener("input", () => {
            const idx = parseInt(slider.value, 10);
            currentN = nOptions[idx] || 8;
            nValEl.textContent = String(currentN);
            ctrl.rebuild();
        });
    }

    // -------------------------------------------------------------------------
    // Initialize Interactive 2: Flattening the Tree
    // -------------------------------------------------------------------------
    function initRadixTreeWidget(container) {
        const modeButtons = Array.from(container.querySelectorAll("[data-mode]"));
        let currentMode = "direct";

        const ctrl = createTreeWidget(container, {
            buildModel: () =>
                currentMode === "radix"
                    ? buildRadixTreeModel(DATASETS[8])
                    : buildDirectIndexModel(DATASETS[8]),
            idleMessage: () =>
                currentMode === "radix"
                    ? "Click <strong>Step Item</strong> or <strong>Play</strong> to route by digit (0–9) with zero comparisons."
                    : "Click <strong>Step Item</strong> or <strong>Play</strong> to watch every item jump straight to its slot in 1 step."
        });

        modeButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const mode = btn.getAttribute("data-mode");
                if (mode === currentMode) return;
                currentMode = mode;
                modeButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
                ctrl.rebuild();
            });
        });
    }

    // -------------------------------------------------------------------------
    // Initialize Interactive 3: The Floor Explorer
    // -------------------------------------------------------------------------
    function initFloorExplorerWidget(container) {
        const N_VAL = 1000;
        const LOG2_N = Math.log2(N_VAL); // ~9.96578

        // Exact log2(1000!) via sum of log2(i)
        let LOG2_NFACT = 0;
        for (let i = 2; i <= N_VAL; i++) {
            LOG2_NFACT += Math.log2(i);
        }

        const choiceButtons = Array.from(container.querySelectorAll("[data-choices]"));
        const outcomeButtons = Array.from(container.querySelectorAll("[data-outcomes]"));

        const elFracNum = container.querySelector('[data-role="frac-num"]');
        const elFracDen = container.querySelector('[data-role="frac-den"]');
        const elResSym = container.querySelector('[data-role="result-sym"]');
        const elResNum = container.querySelector('[data-role="result-num"]');
        const elCancelWrap = container.querySelector('[data-role="cancel-wrap"]');
        const elSpace = container.querySelector('[data-role="metric-space"]');
        const elSpaceSub = container.querySelector('[data-role="metric-space-sub"]');
        const elEntropy = container.querySelector('[data-role="metric-entropy"]');
        const elEntropySub = container.querySelector('[data-role="metric-entropy-sub"]');
        const elBpo = container.querySelector('[data-role="metric-bpo"]');
        const elBpoSub = container.querySelector('[data-role="metric-bpo-sub"]');
        const elBarBase = container.querySelector('[data-role="bar-base"]');
        const elBarCur = container.querySelector('[data-role="bar-cur"]');
        const elBarBaseNum = container.querySelector('[data-role="bar-base-num"]');
        const elBarCurNum = container.querySelector('[data-role="bar-cur-num"]');
        const elNote = container.querySelector('[data-role="explorer-note"]');

        let selectedChoices = "n";
        let selectedOutcomes = "2";

        const CHOICES_DATA = {
            "2": {
                space: "2ⁿ",
                spaceSub: "yes/no label per item",
                entropyBits: N_VAL,
                entropySub: "H(2ⁿ) = n bits",
                numHtml: "n"
            },
            "n": {
                space: "n!",
                spaceSub: "factorial orderings",
                entropyBits: LOG2_NFACT,
                entropySub: "exact log₂(1000!)",
                numHtml: "n · log₂ n"
            },
            "2n": {
                space: "2^(n²)",
                spaceSub: "n×n yes/no binary grid",
                entropyBits: N_VAL * N_VAL,
                entropySub: "H(2^(n²)) = n² bits",
                numHtml: "n²"
            }
        };

        const OUTCOMES_DATA = {
            "2": {
                bits: 1,
                bpoText: "1.00 bit/step",
                bpoSub: "binary yes/no fork",
                denHtml: "1"
            },
            "10": {
                bits: Math.log2(10),
                bpoText: "3.32 bits/step",
                bpoSub: "base-10 digit lookup",
                denHtml: "log₂ 10"
            },
            "n": {
                bits: LOG2_N,
                bpoText: `${LOG2_N.toFixed(2)} bits/step`,
                bpoSub: "direct n-way address",
                denHtml: "log₂ n"
            }
        };

        const COMBO_INFO = {
            "2:2": {
                sym: "Θ(n)",
                note: "Each item needs 1 bit and each yes/no step supplies 1 bit—no log factor ever appears."
            },
            "2:10": {
                sym: "Θ(n)",
                note: "A constant-width 10-way lookup trims the constant factor by 3.32×, while keeping linear Θ(n) scaling."
            },
            "2:n": {
                sym: "Θ(n / log n)",
                note: "Packing log₂ n binary labels into a single word-sized index drops the information floor below n."
            },
            "n:2": {
                sym: "Θ(n log n)",
                note: "The classic comparison-sorting wall: factorial entropy (n log₂ n bits) divided by 1 bit per yes/no comparison."
            },
            "n:10": {
                sym: "Θ(n log n)",
                note: "A fixed constant k = 10 only divides by the constant log₂ 10 ≈ 3.32×—asymptotically still Θ(n log n) unless k grows with n."
            },
            "n:n": {
                sym: "Θ(n)",
                cancel: true,
                note: "When a single memory index resolves 1-of-n buckets (log₂ n bits), the log₂ n factor cancels out completely—leaving linear O(n)."
            },
            "2n:2": {
                sym: "Θ(n²)",
                note: "With n² independent cells in an n×n binary grid, 1 bit per step puts a hard quadratic floor at n²."
            },
            "2n:10": {
                sym: "Θ(n²)",
                note: "A constant 10-way lookup improves the constant factor by 3.32×, but cannot change the quadratic n² scaling."
            },
            "2n:n": {
                sym: "Θ(n² / log n)",
                note: "Word-level n-way lookups save a log₂ n factor (the classic Four Russians speedup), though the problem remains near-quadratic."
            }
        };

        function formatInt(val) {
            return Math.ceil(val).toLocaleString("en-US");
        }

        function render() {
            const c = CHOICES_DATA[selectedChoices];
            const o = OUTCOMES_DATA[selectedOutcomes];
            const info = COMBO_INFO[`${selectedChoices}:${selectedOutcomes}`];

            if (info.cancel) {
                elFracNum.innerHTML = 'n · <span class="nw-cancel">log₂ n</span>';
                elFracDen.innerHTML = '<span class="nw-cancel">log₂ n</span>';
                elCancelWrap.hidden = false;
            } else {
                elFracNum.textContent = c.numHtml;
                elFracDen.textContent = o.denHtml;
                elCancelWrap.hidden = true;
            }

            const baseSteps = Math.ceil(c.entropyBits);
            const curSteps = Math.ceil(c.entropyBits / o.bits);
            const pct = Math.max(4, Math.min(100, (curSteps / baseSteps) * 100));

            elResSym.textContent = info.sym;
            elResNum.textContent = `${curSteps.toLocaleString("en-US")} min steps at n = 1,000`;

            elSpace.textContent = c.space;
            elSpaceSub.textContent = c.spaceSub;
            elEntropy.textContent = `${formatInt(c.entropyBits)} bits`;
            elEntropySub.textContent = c.entropySub;
            elBpo.textContent = o.bpoText;
            elBpoSub.textContent = o.bpoSub;

            elBarBase.style.width = "100%";
            elBarCur.style.width = `${pct.toFixed(1)}%`;
            elBarBaseNum.textContent = `${baseSteps.toLocaleString("en-US")} steps`;
            elBarCurNum.textContent = `${curSteps.toLocaleString("en-US")} steps`;

            elNote.textContent = info.note;
        }

        choiceButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                selectedChoices = btn.getAttribute("data-choices");
                choiceButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
                render();
            });
        });

        outcomeButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                selectedOutcomes = btn.getAttribute("data-outcomes");
                outcomeButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
                render();
            });
        });

        render();
    }

    // -------------------------------------------------------------------------
    // Initialize n -> N Mapping Animation Widget
    // -------------------------------------------------------------------------
    function initNtoNWidget(container) {
        const slider = container.querySelector('[data-role="n-slider"]');
        const nValEl = container.querySelector('[data-role="n-val"]');
        const inputCountEl = container.querySelector('[data-role="input-count"]');
        const inputItemsEl = container.querySelector('[data-role="input-items"]');
        const btnAnim = container.querySelector('[data-action="animate"]');

        const elMax = container.querySelector('[data-scenario="max"]');
        const elBin = container.querySelector('[data-scenario="binary"]');
        const elSort = container.querySelector('[data-scenario="sort"]');
        const footMax = container.querySelector('[data-foot="max"]');
        const footBin = container.querySelector('[data-foot="binary"]');
        const footSort = container.querySelector('[data-foot="sort"]');

        const LETTERS = ["A", "B", "C", "D"];
        let animTimers = [];

        function permutations(arr) {
            if (arr.length <= 1) return [arr.slice()];
            const res = [];
            for (let i = 0; i < arr.length; i++) {
                const rest = arr.slice(0, i).concat(arr.slice(i + 1));
                permutations(rest).forEach((p) => res.push([arr[i]].concat(p)));
            }
            return res;
        }

        function binaryStrings(n) {
            const total = 1 << n;
            const res = [];
            for (let i = 0; i < total; i++) {
                res.push(i.toString(2).padStart(n, "0"));
            }
            return res;
        }

        function fillChips(targetEl, labels) {
            while (targetEl.firstChild) targetEl.removeChild(targetEl.firstChild);
            labels.forEach((txt, idx) => {
                const span = document.createElement("span");
                span.className = "nw-nton-chip";
                span.style.animationDelay = `${Math.min(idx * 18, 280)}ms`;
                span.textContent = txt;
                targetEl.appendChild(span);
            });
        }

        function render(n) {
            nValEl.textContent = String(n);
            inputCountEl.textContent = `n = ${n}`;

            const items = LETTERS.slice(0, n);
            while (inputItemsEl.firstChild) inputItemsEl.removeChild(inputItemsEl.firstChild);
            items.forEach((ch, idx) => {
                const pill = document.createElement("span");
                pill.className = "nw-nton-item-pill";
                pill.style.animationDelay = `${idx * 40}ms`;
                pill.textContent = ch;
                inputItemsEl.appendChild(pill);
            });

            const maxOutcomes = items.map((ch) => `max=${ch}`);
            const binOutcomes = binaryStrings(n);
            const sortOutcomes = permutations(items).map((p) => p.join(""));

            fillChips(elMax, maxOutcomes);
            fillChips(elBin, binOutcomes);
            fillChips(elSort, sortOutcomes);

            footMax.textContent = `N = ${maxOutcomes.length} · H(N) = ${Math.log2(maxOutcomes.length).toFixed(2)} bits`;
            footBin.textContent = `N = ${binOutcomes.length} · H(N) = ${Math.log2(binOutcomes.length).toFixed(2)} bits`;
            footSort.textContent = `N = ${sortOutcomes.length} · H(N) = ${Math.log2(sortOutcomes.length).toFixed(2)} bits`;
        }

        function clearAnim() {
            animTimers.forEach((id) => clearTimeout(id));
            animTimers = [];
        }

        slider.addEventListener("input", () => {
            clearAnim();
            render(parseInt(slider.value, 10));
        });

        btnAnim.addEventListener("click", () => {
            clearAnim();
            [2, 3, 4].forEach((nVal, idx) => {
                const id = setTimeout(() => {
                    slider.value = String(nVal);
                    render(nVal);
                }, idx * 950);
                animTimers.push(id);
            });
        });

        render(parseInt(slider.value, 10) || 3);
    }

    // -------------------------------------------------------------------------
    // Initialize Constant k vs n-Dependent k Scaling Chart Widget
    // -------------------------------------------------------------------------
    function initKScalingWidget(container) {
        const svg = container.querySelector("svg");
        const metricButtons = Array.from(container.querySelectorAll("[data-metric]"));
        const expSlider = container.querySelector('[data-role="exp-slider"]');
        const nReadout = container.querySelector('[data-role="n-readout"]');
        const legendEl = container.querySelector('[data-role="legend"]');

        const W = 680;
        const H = 310;
        const PAD = { left: 62, right: 92, top: 22, bottom: 44 };
        const PLOT_W = W - PAD.left - PAD.right;
        const PLOT_H = H - PAD.top - PAD.bottom;

        const MIN_EXP = 1; // n = 10
        const MAX_EXP = 6; // n = 1,000,000

        const SERIES = [
            {
                id: "k2",
                label: "k = 2",
                sub: "binary (const)",
                color: "#64748b",
                dashed: true,
                ndep: false,
                perItem: (n) => Math.log2(n)
            },
            {
                id: "k10",
                label: "k = 10",
                sub: "decimal (const)",
                color: "#b48224",
                dashed: true,
                ndep: false,
                perItem: (n) => Math.log2(n) / Math.log2(10)
            },
            {
                id: "k256",
                label: "k = 256",
                sub: "byte (const)",
                color: "#c26d3a",
                dashed: true,
                ndep: false,
                perItem: (n) => Math.log2(n) / 8
            },
            {
                id: "ksqrt",
                label: "k = √n",
                sub: "2-pass radix",
                color: "#2b7a91",
                dashed: false,
                ndep: true,
                perItem: () => 2
            },
            {
                id: "kn",
                label: "k = n",
                sub: "direct index",
                color: "#1f7a68",
                dashed: false,
                ndep: true,
                perItem: () => 1
            }
        ];

        let metric = "per-item";
        let currentExp = parseFloat(expSlider.value) || 4;

        function xForExp(exp) {
            return PAD.left + ((exp - MIN_EXP) / (MAX_EXP - MIN_EXP)) * PLOT_W;
        }

        function yForVal(val) {
            if (metric === "per-item") {
                const maxY = 22;
                return PAD.top + PLOT_H - (Math.min(maxY, Math.max(0, val)) / maxY) * PLOT_H;
            }
            const minLog = 1; // 10^1
            const maxLog = 8; // 10^8
            const lv = Math.log10(Math.max(10, val));
            return PAD.top + PLOT_H - ((lv - minLog) / (maxLog - minLog)) * PLOT_H;
        }

        function formatCompact(num) {
            if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
            if (num >= 1e3) return `${(num / 1e3).toFixed(1)}k`;
            return Math.round(num).toLocaleString("en-US");
        }

        function render() {
            const nCur = Math.round(Math.pow(10, currentExp));
            nReadout.textContent = nCur.toLocaleString("en-US");

            while (svg.firstChild) svg.removeChild(svg.firstChild);

            // Gridlines & Y ticks
            const yTicks = metric === "per-item" ? [0, 5, 10, 15, 20] : [1, 2, 3, 4, 5, 6, 7, 8];
            yTicks.forEach((tk) => {
                const y = metric === "per-item" ? yForVal(tk) : yForVal(Math.pow(10, tk));
                svg.appendChild(svgEl("line", {
                    x1: PAD.left, y1: y.toFixed(1), x2: PAD.left + PLOT_W, y2: y.toFixed(1),
                    class: "nw-kscale-gridline"
                }));
                const lbl = metric === "per-item" ? String(tk) : `10^${tk}`;
                svg.appendChild(svgEl("text", {
                    x: PAD.left - 8, y: y.toFixed(1),
                    class: "nw-kscale-tick", "text-anchor": "end", "dominant-baseline": "central"
                }, lbl));
            });

            // X ticks (10^1 .. 10^6)
            for (let e = MIN_EXP; e <= MAX_EXP; e++) {
                const x = xForExp(e);
                svg.appendChild(svgEl("line", {
                    x1: x.toFixed(1), y1: PAD.top, x2: x.toFixed(1), y2: PAD.top + PLOT_H,
                    class: "nw-kscale-gridline"
                }));
                const sup = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶"][e] || String(e);
                svg.appendChild(svgEl("text", {
                    x: x.toFixed(1), y: PAD.top + PLOT_H + 16,
                    class: "nw-kscale-tick", "text-anchor": "middle"
                }, e === 1 ? "10" : `10${sup}`));
            }

            // Axes
            svg.appendChild(svgEl("line", {
                x1: PAD.left, y1: PAD.top + PLOT_H, x2: PAD.left + PLOT_W, y2: PAD.top + PLOT_H,
                class: "nw-kscale-axis"
            }));
            svg.appendChild(svgEl("line", {
                x1: PAD.left, y1: PAD.top, x2: PAD.left, y2: PAD.top + PLOT_H,
                class: "nw-kscale-axis"
            }));

            // Axis titles
            svg.appendChild(svgEl("text", {
                x: PAD.left + PLOT_W / 2, y: H - 8,
                class: "nw-kscale-axis-title", "text-anchor": "middle"
            }, "Input size n (log scale)"));
            svg.appendChild(svgEl("text", {
                x: 16, y: PAD.top + PLOT_H / 2,
                class: "nw-kscale-axis-title", "text-anchor": "middle",
                transform: `rotate(-90 16 ${PAD.top + PLOT_H / 2})`
            }, metric === "per-item" ? "Steps per item (log_k n)" : "Total steps (log scale)"));

            // Curves
            const SAMPLES = 80;
            const endLabelYs = [];

            SERIES.forEach((s) => {
                const pts = [];
                for (let i = 0; i <= SAMPLES; i++) {
                    const exp = MIN_EXP + (i / SAMPLES) * (MAX_EXP - MIN_EXP);
                    const n = Math.pow(10, exp);
                    const per = s.perItem(n);
                    const yVal = metric === "per-item" ? per : n * per;
                    pts.push(`${i === 0 ? "M" : "L"} ${xForExp(exp).toFixed(1)} ${yForVal(yVal).toFixed(1)}`);
                }
                svg.appendChild(svgEl("path", {
                    d: pts.join(" "),
                    fill: "none",
                    stroke: s.color,
                    "stroke-width": s.ndep ? 2.8 : 2,
                    "stroke-dasharray": s.dashed ? "5 4" : "none"
                }));

                // End-of-line label (with simple vertical separation to avoid overlap)
                const nEnd = Math.pow(10, MAX_EXP);
                const endVal = metric === "per-item" ? s.perItem(nEnd) : nEnd * s.perItem(nEnd);
                let ly = yForVal(endVal);
                for (let j = 0; j < endLabelYs.length; j++) {
                    if (Math.abs(ly - endLabelYs[j]) < 12) {
                        ly = endLabelYs[j] + 12;
                    }
                }
                endLabelYs.push(ly);

                svg.appendChild(svgEl("text", {
                    x: PAD.left + PLOT_W + 7,
                    y: ly.toFixed(1),
                    class: "nw-kscale-curve-label",
                    fill: s.color
                }, s.label));
            });

            // Vertical inspection cursor
            const cx = xForExp(currentExp);
            svg.appendChild(svgEl("line", {
                x1: cx.toFixed(1), y1: PAD.top, x2: cx.toFixed(1), y2: PAD.top + PLOT_H,
                class: "nw-kscale-cursor"
            }));

            const binaryPer = Math.log2(nCur);

            // Legend cards + cursor dots
            while (legendEl.firstChild) legendEl.removeChild(legendEl.firstChild);

            SERIES.forEach((s) => {
                const per = s.perItem(nCur);
                const val = metric === "per-item" ? per : nCur * per;
                const cy = yForVal(val);

                svg.appendChild(svgEl("circle", {
                    cx: cx.toFixed(1), cy: cy.toFixed(1), r: s.ndep ? 4.5 : 3.8,
                    fill: s.color, stroke: "#ffffff", "stroke-width": 1.4
                }));

                const ratio = binaryPer / per;
                const item = document.createElement("div");
                item.className = s.ndep ? "nw-kscale-item is-ndep" : "nw-kscale-item";

                const head = document.createElement("div");
                head.className = "nw-kscale-item-head";
                const sw = document.createElement("span");
                sw.className = s.dashed ? "nw-kscale-swatch is-dashed" : "nw-kscale-swatch";
                sw.style.color = s.color;
                sw.style.backgroundColor = s.color;
                head.appendChild(sw);
                head.appendChild(document.createTextNode(s.label));

                const valEl = document.createElement("div");
                valEl.className = "nw-kscale-item-val";
                valEl.textContent = metric === "per-item" ? `${per.toFixed(2)} / item` : formatCompact(val);

                const ratioEl = document.createElement("div");
                ratioEl.className = "nw-kscale-item-ratio";
                if (s.id === "k2") {
                    ratioEl.textContent = "baseline (1.0×)";
                } else if (!s.ndep) {
                    ratioEl.textContent = `${ratio.toFixed(2)}× (fixed)`;
                } else {
                    ratioEl.textContent = `${ratio.toFixed(1)}× (grows w/ n)`;
                }

                item.appendChild(head);
                item.appendChild(valEl);
                item.appendChild(ratioEl);
                legendEl.appendChild(item);
            });
        }

        metricButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                metric = btn.getAttribute("data-metric");
                metricButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
                render();
            });
        });

        expSlider.addEventListener("input", () => {
            currentExp = parseFloat(expSlider.value);
            render();
        });

        render();
    }

    function boot() {
        document.querySelectorAll('[data-nlogn-widget="binary-tree"]').forEach(initBinaryTreeWidget);
        document.querySelectorAll('[data-nlogn-widget="radix-tree"]').forEach(initRadixTreeWidget);
        document.querySelectorAll('[data-nlogn-widget="floor-explorer"]').forEach(initFloorExplorerWidget);
        document.querySelectorAll('[data-nlogn-widget="n-to-N"]').forEach(initNtoNWidget);
        document.querySelectorAll('[data-nlogn-widget="k-scaling"]').forEach(initKScalingWidget);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
