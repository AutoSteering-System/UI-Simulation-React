(function (global) {
    'use strict';

    const EPSILON = 1e-7;
    const TAU = Math.PI * 2;

    const finiteNumber = (value, fallback = 0) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    };

    const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

    const isPoint = (point) => point
        && Number.isFinite(Number(point.x))
        && Number.isFinite(Number(point.y));

    const cleanPoint = (point) => ({ x: Number(point.x), y: Number(point.y) });

    const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

    const positiveAngle = (angle) => {
        const normalized = angle % TAU;
        return normalized < 0 ? normalized + TAU : normalized;
    };

    const counterClockwiseSweep = (startAngle, endAngle) => positiveAngle(endAngle - startAngle);

    const clockwiseSweep = (startAngle, endAngle) => -positiveAngle(startAngle - endAngle);

    const pointToSegment = (point, start, end) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared > EPSILON
            ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1)
            : 0;
        const projected = { x: start.x + dx * t, y: start.y + dy * t };
        return { point: projected, t, distancePx: distance(point, projected) };
    };

    const pointOnPolygonEdge = (point, polygon, tolerance = 1e-5) => {
        for (let index = 0; index < polygon.length; index += 1) {
            const edge = pointToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]);
            if (edge.distancePx <= tolerance) return true;
        }
        return false;
    };

    const distanceToPolygonEdge = (point, polygon) => {
        let nearest = Infinity;
        for (let index = 0; index < polygon.length; index += 1) {
            const edge = pointToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]);
            nearest = Math.min(nearest, edge.distancePx);
        }
        return nearest;
    };

    const isPointInPolygon = (point, polygonPoints) => {
        if (!isPoint(point) || !Array.isArray(polygonPoints)) return false;
        const polygon = polygonPoints.filter(isPoint).map(cleanPoint);
        if (polygon.length < 3) return false;
        const target = cleanPoint(point);
        if (pointOnPolygonEdge(target, polygon)) return true;

        let inside = false;
        for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
            const a = polygon[current];
            const b = polygon[previous];
            const crossesRay = (a.y > target.y) !== (b.y > target.y);
            if (!crossesRay) continue;
            const crossingX = ((b.x - a.x) * (target.y - a.y)) / (b.y - a.y) + a.x;
            if (target.x < crossingX) inside = !inside;
        }
        return inside;
    };

    const pathInsidePolygon = (pathPoints, polygonPoints, safetyMarginPx = 0, initialAllowancePx) => {
        if (!Array.isArray(pathPoints) || pathPoints.length === 0) return false;
        const path = pathPoints.filter(isPoint).map(cleanPoint);
        const polygon = Array.isArray(polygonPoints) ? polygonPoints.filter(isPoint).map(cleanPoint) : [];
        if (path.length === 0) return false;
        if (polygon.length < 3) return true;

        const margin = Math.max(0, finiteNumber(safetyMarginPx));
        const initialAllowance = Math.max(
            1,
            finiteNumber(initialAllowancePx, Math.max(2, margin))
        );
        let travelled = 0;

        for (let index = 0; index < path.length; index += 1) {
            if (index > 0) travelled += distance(path[index - 1], path[index]);
            const edgeDistance = distanceToPolygonEdge(path[index], polygon);
            const inside = isPointInPolygon(path[index], polygon);

            // The live vehicle can begin on (or just outside) a surveyed edge. Clearance
            // ramps up over the first few pixels instead of rejecting that valid start.
            if (!inside && !(travelled <= initialAllowance && edgeDistance <= initialAllowance - travelled + EPSILON)) {
                return false;
            }
            const requiredClearance = Math.min(margin, travelled);
            if (inside && edgeDistance + EPSILON < requiredClearance) return false;
        }
        return true;
    };

    const arcStep = (radius) => {
        const chordLimited = radius > EPSILON
            ? 2 * Math.asin(clamp(3 / (2 * radius), 0, 1))
            : Math.PI / 24;
        return clamp(chordLimited, Math.PI / 90, Math.PI / 24);
    };

    const createPathBuilder = (radiusHint) => {
        const points = [];
        const segments = [];

        const appendPoint = (point) => {
            const next = { v: finiteNumber(point.v), s: finiteNumber(point.s) };
            const last = points[points.length - 1];
            if (!last || Math.hypot(next.v - last.v, next.s - last.s) > EPSILON) points.push(next);
        };

        const appendArc = (center, radius, startAngle, sweep, metadata) => {
            const startIndex = Math.max(0, points.length - 1);
            const steps = Math.max(1, Math.min(720, Math.ceil(Math.abs(sweep) / arcStep(radius))));
            for (let step = 0; step <= steps; step += 1) {
                const angle = startAngle + sweep * (step / steps);
                appendPoint({
                    v: center.v + Math.cos(angle) * radius,
                    s: center.s + Math.sin(angle) * radius
                });
            }
            segments.push({
                startIndex,
                endIndex: points.length - 1,
                kind: 'ARC',
                radiusPx: radius,
                sweepDeg: sweep * 180 / Math.PI,
                ...metadata
            });
        };

        const appendLine = (start, end, metadata) => {
            appendPoint(start);
            const startIndex = Math.max(0, points.length - 1);
            const length = Math.hypot(end.v - start.v, end.s - start.s);
            const spacing = clamp(radiusHint / 12, 3, 8);
            // Keep malformed/imported settings from allocating an unbounded
            // number of samples in the in-browser planner.
            const steps = Math.max(1, Math.min(2048, Math.ceil(length / spacing)));
            for (let step = 1; step <= steps; step += 1) {
                const t = step / steps;
                appendPoint({ v: start.v + (end.v - start.v) * t, s: start.s + (end.s - start.s) * t });
            }
            segments.push({
                startIndex,
                endIndex: points.length - 1,
                kind: 'LINE',
                lengthPx: length,
                ...metadata
            });
        };

        return { points, segments, appendArc, appendLine };
    };

    const buildUTurn = (laneOffset, radius) => {
        const builder = createPathBuilder(radius);
        builder.appendArc({ v: radius, s: 0 }, radius, Math.PI, -Math.PI / 2, {
            gear: 'FORWARD',
            steer: 'TOWARD_TARGET',
            phase: 'ENTRY'
        });
        if (laneOffset - radius > radius + EPSILON) {
            builder.appendLine({ v: radius, s: radius }, { v: laneOffset - radius, s: radius }, {
                gear: 'FORWARD',
                steer: 'STRAIGHT',
                phase: 'CROSS'
            });
        }
        builder.appendArc({ v: laneOffset - radius, s: 0 }, radius, Math.PI / 2, -Math.PI / 2, {
            gear: 'FORWARD',
            steer: 'TOWARD_TARGET',
            phase: 'EXIT'
        });
        return builder;
    };

    const buildOmegaTurn = (laneOffset, radius) => {
        const builder = createPathBuilder(radius);
        const firstCenter = { v: -radius, s: 0 };
        const lastCenter = { v: laneOffset + radius, s: 0 };
        const centerDistance = laneOffset + radius * 2;
        const middleCenter = {
            v: laneOffset / 2,
            s: Math.sqrt(Math.max(0, radius * radius * 4 - centerDistance * centerDistance / 4))
        };
        const firstTangent = {
            v: (firstCenter.v + middleCenter.v) / 2,
            s: (firstCenter.s + middleCenter.s) / 2
        };
        const secondTangent = {
            v: (middleCenter.v + lastCenter.v) / 2,
            s: (middleCenter.s + lastCenter.s) / 2
        };
        const firstEndAngle = Math.atan2(firstTangent.s - firstCenter.s, firstTangent.v - firstCenter.v);
        const middleStartAngle = Math.atan2(firstTangent.s - middleCenter.s, firstTangent.v - middleCenter.v);
        const middleEndAngle = Math.atan2(secondTangent.s - middleCenter.s, secondTangent.v - middleCenter.v);
        const lastStartAngle = Math.atan2(secondTangent.s - lastCenter.s, secondTangent.v - lastCenter.v);

        builder.appendArc(firstCenter, radius, 0, counterClockwiseSweep(0, firstEndAngle), {
            gear: 'FORWARD',
            steer: 'AWAY_FROM_TARGET',
            phase: 'OPEN'
        });
        builder.appendArc(middleCenter, radius, middleStartAngle, clockwiseSweep(middleStartAngle, middleEndAngle), {
            gear: 'FORWARD',
            steer: 'TOWARD_TARGET',
            phase: 'LOOP'
        });
        builder.appendArc(lastCenter, radius, lastStartAngle, counterClockwiseSweep(lastStartAngle, Math.PI), {
            gear: 'FORWARD',
            steer: 'AWAY_FROM_TARGET',
            phase: 'CLOSE'
        });
        return builder;
    };

    const buildFishTailTurn = (laneOffset, minimumRadius) => {
        const radius = Math.max(minimumRadius, laneOffset / 2);
        const cosine = clamp(0.5 - laneOffset / (4 * radius), 0, 0.5);
        const entryAngle = Math.acos(cosine);
        const reverseEndHeading = Math.PI - entryAngle;
        const builder = createPathBuilder(radius);

        const firstCenter = { v: radius, s: 0 };
        builder.appendArc(firstCenter, radius, Math.PI, -entryAngle, {
            gear: 'FORWARD',
            steer: 'TOWARD_TARGET',
            phase: 'FORWARD_ENTRY'
        });

        const firstCusp = builder.points[builder.points.length - 1];
        const reverseCenter = {
            v: radius * (1 - 2 * cosine),
            s: radius * 2 * Math.sin(entryAngle)
        };
        builder.appendArc(reverseCenter, radius, -entryAngle, -(reverseEndHeading - entryAngle), {
            gear: 'REVERSE',
            steer: 'AWAY_FROM_TARGET',
            phase: 'REVERSE'
        });

        const secondCusp = builder.points[builder.points.length - 1];
        const lastCenter = { v: laneOffset - radius, s: 0 };
        builder.appendArc(lastCenter, radius, entryAngle, -entryAngle, {
            gear: 'FORWARD',
            steer: 'TOWARD_TARGET',
            phase: 'FORWARD_EXIT'
        });

        return { builder, radius, firstCusp, secondCusp };
    };

    const planBasicTurn = (options = {}) => {
        const position = isPoint(options.position) ? cleanPoint(options.position) : null;
        const headingDeg = finiteNumber(options.headingDeg, NaN);
        const laneSpacingPx = finiteNumber(options.laneSpacingPx, NaN);
        const passDelta = Math.min(64, Math.max(1, Math.round(finiteNumber(options.passDelta, 1))));
        const minimumRadius = finiteNumber(options.minRadiusPx, NaN);
        const direction = finiteNumber(options.direction, 1) < 0 ? -1 : 1;
        const safetyMargin = Math.max(0, finiteNumber(options.safetyMarginPx));
        const targetLaneDelta = direction * passDelta;
        const invalidResult = (reason) => ({
            points: position ? [position] : [],
            segments: [],
            markers: position ? [{ type: 'START', point: position, index: 0 }] : [],
            targetLaneDelta,
            targetLaneOffsetPx: Number.isFinite(laneSpacingPx) ? direction * laneSpacingPx * passDelta : 0,
            requiredDepthPx: 0,
            shape: null,
            feasible: false,
            failReason: reason
        });

        if (!position || !Number.isFinite(headingDeg)) return invalidResult('INVALID_POSE');
        if (!(laneSpacingPx > EPSILON) || !(minimumRadius > EPSILON)) return invalidResult('INVALID_DIMENSIONS');

        const laneOffset = laneSpacingPx * passDelta;
        const normalizedPattern = String(options.pattern || '').trim().toUpperCase().replace(/[^A-Z]/g, '_');
        const isFishTail = normalizedPattern.includes('FISH');
        // A fish-tail degenerates to a zero-length reverse cusp once the target
        // pass is at least 2R away. In that case the safer and shorter result is
        // the ordinary forward U that already fits the available lane spacing.
        const fishTailRequired = isFishTail && laneOffset + EPSILON < minimumRadius * 2;
        const shape = fishTailRequired ? 'FISH_TAIL' : (laneOffset + EPSILON >= minimumRadius * 2 ? 'U' : 'OMEGA');

        let builder;
        let actualRadius = minimumRadius;
        let cuspPoints = [];
        if (shape === 'U') {
            builder = buildUTurn(laneOffset, minimumRadius);
        } else if (shape === 'OMEGA') {
            builder = buildOmegaTurn(laneOffset, minimumRadius);
        } else {
            const fishTail = buildFishTailTurn(laneOffset, minimumRadius);
            builder = fishTail.builder;
            actualRadius = fishTail.radius;
            cuspPoints = [fishTail.firstCusp, fishTail.secondCusp];
        }

        const heading = headingDeg * Math.PI / 180;
        const forward = { x: Math.sin(heading), y: -Math.cos(heading) };
        const right = { x: Math.cos(heading), y: Math.sin(heading) };
        const side = { x: right.x * direction, y: right.y * direction };
        const toWorld = (localPoint) => ({
            x: position.x + side.x * localPoint.v + forward.x * localPoint.s,
            y: position.y + side.y * localPoint.v + forward.y * localPoint.s
        });
        const points = builder.points.map(toWorld);
        const localApexIndex = builder.points.reduce((bestIndex, point, index, allPoints) => (
            point.s > allPoints[bestIndex].s ? index : bestIndex
        ), 0);
        const markers = [
            { type: 'START', point: points[0], index: 0 },
            { type: 'APEX', point: points[localApexIndex], index: localApexIndex },
            { type: 'EXIT', point: points[points.length - 1], index: points.length - 1 }
        ];

        if (shape === 'FISH_TAIL') {
            const findLocalIndex = (target) => builder.points.reduce((bestIndex, point, index, allPoints) => (
                Math.hypot(point.v - target.v, point.s - target.s)
                    < Math.hypot(allPoints[bestIndex].v - target.v, allPoints[bestIndex].s - target.s)
                    ? index
                    : bestIndex
            ), 0);
            const reverseIndex = findLocalIndex(cuspPoints[0]);
            const forwardIndex = findLocalIndex(cuspPoints[1]);
            markers.push(
                { type: 'CUSP_REVERSE', point: points[reverseIndex], index: reverseIndex, gear: 'REVERSE' },
                { type: 'CUSP_FORWARD', point: points[forwardIndex], index: forwardIndex, gear: 'FORWARD' }
            );
        }

        const boundary = Array.isArray(options.boundaryPoints) ? options.boundaryPoints.filter(isPoint).map(cleanPoint) : [];
        const boundaryValid = boundary.length < 3 || pathInsidePolygon(points, boundary, safetyMargin);
        const maximumForwardDepth = builder.points.reduce((maximum, point) => Math.max(maximum, point.s), 0);

        return {
            points,
            segments: builder.segments,
            markers,
            targetLaneDelta,
            targetLaneOffsetPx: direction * laneOffset,
            requiredDepthPx: maximumForwardDepth + safetyMargin,
            turnRadiusPx: actualRadius,
            shape,
            feasible: boundaryValid,
            failReason: boundaryValid ? null : 'BOUNDARY_CLEARANCE'
        };
    };

    const nearestPathProgress = (pathPoints, targetPoint, startIndex = 0) => {
        const points = Array.isArray(pathPoints) ? pathPoints.filter(isPoint).map(cleanPoint) : [];
        if (points.length === 0 || !isPoint(targetPoint)) return null;
        if (points.length === 1) {
            return {
                index: 0,
                progressIndex: 0,
                segmentIndex: 0,
                t: 0,
                point: points[0],
                distancePx: distance(points[0], cleanPoint(targetPoint)),
                distanceAlongPx: 0
            };
        }

        const requestedStart = typeof startIndex === 'object' && startIndex
            ? finiteNumber(startIndex.segmentIndex, finiteNumber(startIndex.index, 0))
            : finiteNumber(startIndex, 0);
        const firstSegment = clamp(Math.floor(requestedStart) - 1, 0, points.length - 2);
        const cumulative = new Array(points.length).fill(0);
        for (let index = 1; index < points.length; index += 1) {
            cumulative[index] = cumulative[index - 1] + distance(points[index - 1], points[index]);
        }

        const target = cleanPoint(targetPoint);
        let best = null;
        for (let index = firstSegment; index < points.length - 1; index += 1) {
            const projection = pointToSegment(target, points[index], points[index + 1]);
            if (!best || projection.distancePx < best.distancePx - EPSILON) {
                best = {
                    index,
                    progressIndex: index,
                    segmentIndex: index,
                    t: projection.t,
                    point: projection.point,
                    distancePx: projection.distancePx,
                    distanceAlongPx: cumulative[index] + distance(points[index], projection.point)
                };
            }
        }
        return best;
    };

    const lookaheadPoint = (pathPoints, progressIndex = 0, distancePx = 0) => {
        const points = Array.isArray(pathPoints) ? pathPoints.filter(isPoint).map(cleanPoint) : [];
        if (points.length === 0) return null;
        if (points.length === 1) {
            return { ...points[0], index: 0, progressIndex: 0, segmentIndex: 0, t: 0, reachedEnd: true };
        }

        const requestedDistance = Math.max(0, finiteNumber(distancePx));
        const progress = typeof progressIndex === 'object' && progressIndex
            ? progressIndex
            : null;
        let segmentIndex = clamp(Math.floor(finiteNumber(
            progress ? progress.segmentIndex : progressIndex,
            0
        )), 0, points.length - 2);
        let current = progress && isPoint(progress.point)
            ? cleanPoint(progress.point)
            : { ...points[segmentIndex] };
        let remaining = requestedDistance;

        while (segmentIndex < points.length - 1) {
            const segmentEnd = points[segmentIndex + 1];
            const available = distance(current, segmentEnd);
            if (remaining <= available + EPSILON) {
                const t = available > EPSILON ? clamp(remaining / available, 0, 1) : 1;
                const result = {
                    x: current.x + (segmentEnd.x - current.x) * t,
                    y: current.y + (segmentEnd.y - current.y) * t,
                    index: segmentIndex,
                    progressIndex: segmentIndex,
                    segmentIndex,
                    t,
                    reachedEnd: segmentIndex === points.length - 2 && t >= 1 - EPSILON
                };
                return result;
            }
            remaining -= available;
            segmentIndex += 1;
            current = { ...points[segmentIndex] };
        }

        return {
            ...points[points.length - 1],
            index: points.length - 1,
            progressIndex: points.length - 1,
            segmentIndex: points.length - 2,
            t: 1,
            reachedEnd: true
        };
    };

    global.TurnGeometry = Object.freeze({
        planBasicTurn,
        nearestPathProgress,
        lookaheadPoint,
        isPointInPolygon,
        distanceToPolygonEdge,
        pathInsidePolygon
    });
}(typeof window !== 'undefined' ? window : globalThis));
