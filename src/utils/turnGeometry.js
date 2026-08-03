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

    // Adjacent passes closer than 2R cannot be joined by a simple semicircle.
    // Use a one-sided keyhole/bulb connector. The current guidance pass is the
    // entry stem: begin the turn at its headland trigger, make the large loop
    // entirely toward the selected pass, then re-enter that pass behind the
    // trigger. This preserves the calibrated radius without flaring across the
    // already-worked side or drawing a duplicate straight entry segment.
    const buildOneSidedBulbTurn = (laneOffset, radius) => {
        const builder = createPathBuilder(radius);
        const exitCorrectionAngle = Math.acos(clamp(laneOffset / (radius * 2), 0, 1));
        const exitSetback = radius * 2 * Math.sin(exitCorrectionAngle);

        // The long clockwise arc is the visible one-sided keyhole bulb. It begins
        // tangent to the entry pass and continues beyond 180 degrees until it
        // reaches the external tangent shared with the exit-alignment circle.
        builder.appendArc(
            { v: radius, s: 0 },
            radius,
            Math.PI,
            -(Math.PI + exitCorrectionAngle),
            {
                gear: 'FORWARD',
                steer: 'TOWARD_TARGET',
                phase: 'ONE_SIDED_BULB'
            }
        );

        builder.appendArc(
            { v: laneOffset + radius, s: -exitSetback },
            radius,
            Math.PI - exitCorrectionAngle,
            exitCorrectionAngle,
            {
                gear: 'FORWARD',
                steer: 'AWAY_FROM_TARGET',
                phase: 'EXIT_ALIGN'
            }
        );
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
        const forwardBulbExplicitlyRequested = normalizedPattern.includes('OMEGA')
            || normalizedPattern.includes('BULB')
            || normalizedPattern.includes('KEYHOLE')
            || normalizedPattern.includes('ONE_SIDED');
        // A fish-tail degenerates to a zero-length reverse cusp once the target
        // pass is at least 2R away. In that case the safer and shorter result is
        // the ordinary forward U that already fits the available lane spacing.
        const fishTailRequired = isFishTail && laneOffset + EPSILON < minimumRadius * 2;
        if (!fishTailRequired
            && laneOffset + EPSILON < minimumRadius * 2
            && !forwardBulbExplicitlyRequested) {
            return invalidResult('FORWARD_U_SPACING_TOO_NARROW');
        }
        const shape = fishTailRequired
            ? 'FISH_TAIL'
            : laneOffset + EPSILON >= minimumRadius * 2
                ? 'U'
                : 'FORWARD_BULB';

        let builder;
        let actualRadius = minimumRadius;
        let cuspPoints = [];
        if (shape === 'U') {
            builder = buildUTurn(laneOffset, minimumRadius);
        } else if (shape === 'FORWARD_BULB') {
            builder = buildOneSidedBulbTurn(laneOffset, minimumRadius);
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

        const rawBoundary = options.boundaryPoints;
        const boundary = Array.isArray(rawBoundary) ? cleanPolygon(rawBoundary) : [];
        const boundaryGeometryValid = !Array.isArray(rawBoundary)
            || rawBoundary.length === 0
            || (rawBoundary.length >= 3
                && rawBoundary.every(isPoint)
                && isSimplePolygon(boundary));
        const boundaryValid = boundaryGeometryValid
            && (boundary.length === 0 || pathInsidePolygon(points, boundary, safetyMargin));
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
            failReason: boundaryValid ? null : boundaryGeometryValid ? 'BOUNDARY_CLEARANCE' : 'INVALID_BOUNDARY'
        };
    };

    const dot = (a, b) => a.x * b.x + a.y * b.y;

    const addScaled = (origin, direction, amount) => ({
        x: origin.x + direction.x * amount,
        y: origin.y + direction.y * amount
    });

    const normalizeHeadingDeg = (headingDeg) => {
        const normalized = finiteNumber(headingDeg) % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    };

    const polygonSignedArea = (polygon) => polygon.reduce((area, point, index) => {
        const next = polygon[(index + 1) % polygon.length];
        return area + point.x * next.y - next.x * point.y;
    }, 0) / 2;

    const cleanPolygon = (polygonPoints) => {
        if (!Array.isArray(polygonPoints)) return [];
        const polygon = [];
        polygonPoints.filter(isPoint).map(cleanPoint).forEach((point) => {
            const previous = polygon[polygon.length - 1];
            if (!previous || distance(previous, point) > EPSILON) polygon.push(point);
        });
        if (polygon.length > 1 && distance(polygon[0], polygon[polygon.length - 1]) <= EPSILON) polygon.pop();
        return polygon;
    };

    const orientation = (a, b, c) => (
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
    );

    const pointOnSegment = (point, start, end, tolerance = EPSILON) => (
        Math.abs(orientation(start, end, point)) <= tolerance
        && point.x >= Math.min(start.x, end.x) - tolerance
        && point.x <= Math.max(start.x, end.x) + tolerance
        && point.y >= Math.min(start.y, end.y) - tolerance
        && point.y <= Math.max(start.y, end.y) + tolerance
    );

    const segmentsIntersect = (a, b, c, d) => {
        const abC = orientation(a, b, c);
        const abD = orientation(a, b, d);
        const cdA = orientation(c, d, a);
        const cdB = orientation(c, d, b);
        if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON))
            && ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) {
            return true;
        }
        return (Math.abs(abC) <= EPSILON && pointOnSegment(c, a, b))
            || (Math.abs(abD) <= EPSILON && pointOnSegment(d, a, b))
            || (Math.abs(cdA) <= EPSILON && pointOnSegment(a, c, d))
            || (Math.abs(cdB) <= EPSILON && pointOnSegment(b, c, d));
    };

    const isSimplePolygon = (polygon) => {
        if (polygon.length < 3 || Math.abs(polygonSignedArea(polygon)) <= EPSILON) return false;
        for (let first = 0; first < polygon.length; first += 1) {
            const firstNext = (first + 1) % polygon.length;
            if (distance(polygon[first], polygon[firstNext]) <= EPSILON) return false;
            for (let second = first + 1; second < polygon.length; second += 1) {
                const secondNext = (second + 1) % polygon.length;
                const adjacent = first === second
                    || firstNext === second
                    || secondNext === first;
                if (adjacent) continue;
                if (segmentsIntersect(
                    polygon[first], polygon[firstNext],
                    polygon[second], polygon[secondNext]
                )) return false;
            }
        }
        return true;
    };

    const segmentDistance = (a, b, c, d) => {
        if (segmentsIntersect(a, b, c, d)) return 0;
        return Math.min(
            pointToSegment(a, c, d).distancePx,
            pointToSegment(b, c, d).distancePx,
            pointToSegment(c, a, b).distancePx,
            pointToSegment(d, a, b).distancePx
        );
    };

    const segmentIntersectionParameter = (start, end, edgeStart, edgeEnd) => {
        const route = { x: end.x - start.x, y: end.y - start.y };
        const edge = { x: edgeEnd.x - edgeStart.x, y: edgeEnd.y - edgeStart.y };
        const denominator = route.x * edge.y - route.y * edge.x;
        if (Math.abs(denominator) <= EPSILON) return null;
        const offset = { x: edgeStart.x - start.x, y: edgeStart.y - start.y };
        const t = (offset.x * edge.y - offset.y * edge.x) / denominator;
        const u = (offset.x * route.y - offset.y * route.x) / denominator;
        return t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON
            ? clamp(t, 0, 1)
            : null;
    };

    const segmentStrictlyInsidePolygon = (start, end, polygon, safetyMargin) => {
        if (!isPointInPolygon(start, polygon) || !isPointInPolygon(end, polygon)) return false;
        const margin = Math.max(0, finiteNumber(safetyMargin));
        if (margin > EPSILON
            && (distanceToPolygonEdge(start, polygon) + EPSILON < margin
                || distanceToPolygonEdge(end, polygon) + EPSILON < margin)) return false;

        const breakpoints = [0, 1];
        for (let index = 0; index < polygon.length; index += 1) {
            const edgeStart = polygon[index];
            const edgeEnd = polygon[(index + 1) % polygon.length];
            const intersectionT = segmentIntersectionParameter(start, end, edgeStart, edgeEnd);
            if (intersectionT !== null) breakpoints.push(intersectionT);
            if (margin > EPSILON
                && segmentDistance(start, end, edgeStart, edgeEnd) + EPSILON < margin) return false;
        }
        breakpoints.sort((a, b) => a - b);
        for (let index = 1; index < breakpoints.length; index += 1) {
            const lower = breakpoints[index - 1];
            const upper = breakpoints[index];
            if (upper - lower <= EPSILON) continue;
            const midpoint = (lower + upper) / 2;
            if (!isPointInPolygon({
                x: start.x + (end.x - start.x) * midpoint,
                y: start.y + (end.y - start.y) * midpoint
            }, polygon)) return false;
        }
        return true;
    };

    const strictPathInsidePolygon = (pathPoints, polygon, safetyMargin) => {
        const points = Array.isArray(pathPoints) ? pathPoints.filter(isPoint).map(cleanPoint) : [];
        if (points.length === 0) return false;
        if (points.length === 1) {
            return isPointInPolygon(points[0], polygon)
                && distanceToPolygonEdge(points[0], polygon) + EPSILON >= safetyMargin;
        }
        for (let index = 1; index < points.length; index += 1) {
            if (!segmentStrictlyInsidePolygon(points[index - 1], points[index], polygon, safetyMargin)) return false;
        }
        return true;
    };

    const pathWithinBoundaryBand = (pathPoints, polygon, maximumDepthPx) => {
        const points = Array.isArray(pathPoints) ? pathPoints.filter(isPoint).map(cleanPoint) : [];
        const maximumDepth = finiteNumber(maximumDepthPx, NaN);
        if (points.length === 0 || !(maximumDepth >= 0)) return false;
        if (points.length === 1) {
            return distanceToPolygonEdge(points[0], polygon) <= maximumDepth + EPSILON;
        }
        // Distance-to-boundary is 1-Lipschitz. For a short chord of length L,
        // (d(start) + d(end) + L) / 2 is a conservative upper bound on the
        // greatest possible boundary distance between its endpoints.
        const maximumStep = clamp(maximumDepth / 10, 0.5, 2);
        for (let index = 1; index < points.length; index += 1) {
            const start = points[index - 1];
            const end = points[index];
            const length = distance(start, end);
            const steps = Math.max(1, Math.ceil(length / maximumStep));
            let previous = start;
            let previousDepth = distanceToPolygonEdge(previous, polygon);
            if (previousDepth > maximumDepth + EPSILON) return false;
            for (let step = 1; step <= steps; step += 1) {
                const ratio = step / steps;
                const current = {
                    x: start.x + (end.x - start.x) * ratio,
                    y: start.y + (end.y - start.y) * ratio
                };
                const currentDepth = distanceToPolygonEdge(current, polygon);
                const chordLength = distance(previous, current);
                if (currentDepth > maximumDepth + EPSILON
                    || (previousDepth + currentDepth + chordLength) / 2 > maximumDepth + EPSILON) {
                    return false;
                }
                previous = current;
                previousDepth = currentDepth;
            }
        }
        return true;
    };

    const linePolygonIntervals = (origin, forward, normal, laneOffset, polygon) => {
        const crossings = [];
        for (let index = 0; index < polygon.length; index += 1) {
            const start = polygon[index];
            const end = polygon[(index + 1) % polygon.length];
            const startOffset = dot({ x: start.x - origin.x, y: start.y - origin.y }, normal);
            const endOffset = dot({ x: end.x - origin.x, y: end.y - origin.y }, normal);
            const crosses = (startOffset <= laneOffset && endOffset > laneOffset)
                || (endOffset <= laneOffset && startOffset > laneOffset);
            if (!crosses) continue;
            const ratio = (laneOffset - startOffset) / (endOffset - startOffset);
            const intersection = {
                x: start.x + (end.x - start.x) * ratio,
                y: start.y + (end.y - start.y) * ratio
            };
            crossings.push(dot({ x: intersection.x - origin.x, y: intersection.y - origin.y }, forward));
        }
        crossings.sort((a, b) => a - b);
        const unique = crossings.filter((value, index) => index === 0 || Math.abs(value - crossings[index - 1]) > 1e-5);
        const intervals = [];
        for (let index = 1; index < unique.length; index += 2) {
            if (unique[index] - unique[index - 1] > EPSILON) {
                intervals.push({ minT: unique[index - 1], maxT: unique[index] });
            }
        }
        return intervals;
    };

    const safeLaneFragments = (origin, forward, interval, polygon, safetyMargin) => {
        const span = interval.maxT - interval.minT;
        if (!(span > EPSILON)) return [];
        if (safetyMargin <= EPSILON) {
            const inset = Math.min(0.01, span / 8);
            const minT = interval.minT + inset;
            const maxT = interval.maxT - inset;
            const start = addScaled(origin, forward, minT);
            const end = addScaled(origin, forward, maxT);
            return maxT > minT && segmentStrictlyInsidePolygon(start, end, polygon, 0)
                ? [{ minT, maxT }]
                : [];
        }

        const sampleStep = clamp(safetyMargin / 3, 0.5, 2);
        const sampleCount = Math.ceil(span / sampleStep);
        // A pathological imported boundary must not freeze the browser planner.
        if (sampleCount > 50000) return [];
        const samples = [];
        for (let index = 0; index <= sampleCount; index += 1) {
            const t = interval.minT + span * (index / sampleCount);
            const point = addScaled(origin, forward, t);
            samples.push({
                t,
                safe: isPointInPolygon(point, polygon)
                    && distanceToPolygonEdge(point, polygon) + EPSILON >= safetyMargin + sampleStep
            });
        }

        const fragments = [];
        let runStart = null;
        samples.forEach((sample, index) => {
            if (sample.safe && runStart === null) runStart = index;
            const runEnded = runStart !== null && (!sample.safe || index === samples.length - 1);
            if (!runEnded) return;
            const runEnd = sample.safe ? index : index - 1;
            const minT = samples[runStart].t;
            const maxT = samples[runEnd].t;
            const start = addScaled(origin, forward, minT);
            const end = addScaled(origin, forward, maxT);
            if (maxT - minT > EPSILON
                && segmentStrictlyInsidePolygon(start, end, polygon, safetyMargin)) {
                fragments.push({ minT, maxT });
            }
            runStart = null;
        });
        return fragments;
    };

    const subtractWorkedIntervals = (fragment, workedIntervals) => {
        const clipped = (Array.isArray(workedIntervals) ? workedIntervals : [])
            .filter(interval => Array.isArray(interval)
                && interval.length >= 2
                && Number.isFinite(Number(interval[0]))
                && Number.isFinite(Number(interval[1])))
            .map(interval => ({
                minT: Math.max(fragment.minT, Math.min(Number(interval[0]), Number(interval[1]))),
                maxT: Math.min(fragment.maxT, Math.max(Number(interval[0]), Number(interval[1])))
            }))
            .filter(interval => interval.maxT - interval.minT > EPSILON)
            .sort((a, b) => a.minT - b.minT);
        const merged = [];
        clipped.forEach(interval => {
            const previous = merged[merged.length - 1];
            if (previous && interval.minT <= previous.maxT + EPSILON) {
                previous.maxT = Math.max(previous.maxT, interval.maxT);
            } else merged.push({ ...interval });
        });
        const remaining = [];
        let cursor = fragment.minT;
        merged.forEach(interval => {
            if (interval.minT - cursor > EPSILON) remaining.push({ minT: cursor, maxT: interval.minT });
            cursor = Math.max(cursor, interval.maxT);
        });
        if (fragment.maxT - cursor > EPSILON) remaining.push({ minT: cursor, maxT: fragment.maxT });
        return remaining;
    };

    const pathLength = (pathPoints) => {
        let length = 0;
        for (let index = 1; index < pathPoints.length; index += 1) {
            length += distance(pathPoints[index - 1], pathPoints[index]);
        }
        return length;
    };

    const routeViaHeadland = (start, end, headlandPoints, polygon, safetyMargin) => {
        const ring = cleanPolygon(headlandPoints);
        if (!isSimplePolygon(ring)
            || !strictPathInsidePolygon([...ring, ring[0]], polygon, safetyMargin)) return null;
        const nearestIndex = (target) => ring.reduce((best, point, index) => (
            distance(target, point) < distance(target, ring[best]) ? index : best
        ), 0);
        const startIndex = nearestIndex(start);
        const endIndex = nearestIndex(end);
        if (!segmentStrictlyInsidePolygon(start, ring[startIndex], polygon, safetyMargin)
            || !segmentStrictlyInsidePolygon(ring[endIndex], end, polygon, safetyMargin)) return null;

        const walk = (step) => {
            const points = [start, ring[startIndex]];
            let index = startIndex;
            let guard = 0;
            while (index !== endIndex && guard <= ring.length) {
                index = (index + step + ring.length) % ring.length;
                points.push(ring[index]);
                guard += 1;
            }
            points.push(end);
            return strictPathInsidePolygon(points, polygon, safetyMargin) ? points : null;
        };
        const forwardPath = walk(1);
        const reversePath = walk(-1);
        if (!forwardPath) return reversePath;
        if (!reversePath) return forwardPath;
        return pathLength(forwardPath) <= pathLength(reversePath) ? forwardPath : reversePath;
    };

    const dubinsCandidates = (alpha, beta, normalizedDistance) => {
        const sa = Math.sin(alpha);
        const sb = Math.sin(beta);
        const ca = Math.cos(alpha);
        const cb = Math.cos(beta);
        const cosineDifference = Math.cos(alpha - beta);
        const d = normalizedDistance;
        const candidates = [];
        const addCandidate = (word, values) => {
            if (!values || values.some(value => !Number.isFinite(value) || value < -EPSILON)) return;
            candidates.push({ word, values: values.map(value => Math.max(0, value)) });
        };

        let temporary;
        let squared;
        let middle;
        squared = 2 + d * d - 2 * cosineDifference + 2 * d * (sa - sb);
        if (squared >= -EPSILON) {
            temporary = Math.atan2(cb - ca, d + sa - sb);
            addCandidate('LSL', [positiveAngle(-alpha + temporary), Math.sqrt(Math.max(0, squared)), positiveAngle(beta - temporary)]);
        }
        squared = 2 + d * d - 2 * cosineDifference + 2 * d * (-sa + sb);
        if (squared >= -EPSILON) {
            temporary = Math.atan2(ca - cb, d - sa + sb);
            addCandidate('RSR', [positiveAngle(alpha - temporary), Math.sqrt(Math.max(0, squared)), positiveAngle(-beta + temporary)]);
        }
        squared = -2 + d * d + 2 * cosineDifference + 2 * d * (sa + sb);
        if (squared >= -EPSILON) {
            middle = Math.sqrt(Math.max(0, squared));
            temporary = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, middle);
            addCandidate('LSR', [positiveAngle(-alpha + temporary), middle, positiveAngle(-beta + temporary)]);
        }
        squared = d * d - 2 + 2 * cosineDifference - 2 * d * (sa + sb);
        if (squared >= -EPSILON) {
            middle = Math.sqrt(Math.max(0, squared));
            temporary = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, middle);
            addCandidate('RSL', [positiveAngle(alpha - temporary), middle, positiveAngle(beta - temporary)]);
        }
        temporary = (6 - d * d + 2 * cosineDifference + 2 * d * (sa - sb)) / 8;
        if (Math.abs(temporary) <= 1 + EPSILON) {
            middle = positiveAngle(TAU - Math.acos(clamp(temporary, -1, 1)));
            const first = positiveAngle(alpha - Math.atan2(ca - cb, d - sa + sb) + middle / 2);
            addCandidate('RLR', [first, middle, positiveAngle(alpha - beta - first + middle)]);
        }
        temporary = (6 - d * d + 2 * cosineDifference + 2 * d * (-sa + sb)) / 8;
        if (Math.abs(temporary) <= 1 + EPSILON) {
            middle = positiveAngle(TAU - Math.acos(clamp(temporary, -1, 1)));
            const first = positiveAngle(-alpha - Math.atan2(ca - cb, d + sa - sb) + middle / 2);
            addCandidate('LRL', [first, middle, positiveAngle(beta - alpha - first + middle)]);
        }
        return candidates;
    };

    // Testing every sampled headland pose is unnecessarily expensive because
    // each full Dubins test samples the curve and then checks every point
    // against every polygon edge. Rank the poses with the exact unconstrained
    // Dubins length first, then run the expensive safety checks on a small,
    // directionally and spatially diverse shortlist.
    const unconstrainedDubinsLength = (
        start,
        end,
        startHeadingDeg,
        endHeadingDeg,
        radius
    ) => {
        const dx = end.x - start.x;
        const dy = -(end.y - start.y);
        const lineAngle = Math.atan2(dy, dx);
        const startHeading = (90 - startHeadingDeg) * Math.PI / 180;
        const endHeading = (90 - endHeadingDeg) * Math.PI / 180;
        const candidates = dubinsCandidates(
            positiveAngle(startHeading - lineAngle),
            positiveAngle(endHeading - lineAngle),
            Math.hypot(dx, dy) / radius
        );
        return candidates.reduce((shortest, candidate) => Math.min(
            shortest,
            candidate.values.reduce((sum, value) => sum + value, 0) * radius
        ), Infinity);
    };

    const buildHeadlandTargetPoses = (circuit, maximumSamples = 96) => {
        if (!Array.isArray(circuit) || circuit.length < 2) return [];
        const stride = Math.max(1, Math.ceil(circuit.length / maximumSamples));
        const poses = [];
        for (let circuitIndex = 0; circuitIndex < circuit.length; circuitIndex += stride) {
            const target = circuit[circuitIndex];
            [1, -1].forEach(circuitDirection => {
                const nextIndex = (
                    circuitIndex + circuitDirection + circuit.length
                ) % circuit.length;
                const next = circuit[nextIndex];
                poses.push({
                    target,
                    circuitIndex,
                    circuitDirection,
                    targetHeading: normalizeHeadingDeg(Math.atan2(
                        next.x - target.x,
                        -(next.y - target.y)
                    ) * 180 / Math.PI)
                });
            });
        }
        return poses;
    };

    const rankHeadlandTargetPoses = (
        targetPoses,
        circuitLength,
        start,
        startHeadingDeg,
        radius,
        maximumCandidates = 32
    ) => {
        const ranked = targetPoses.map(pose => ({
            ...pose,
            rankLengthPx: unconstrainedDubinsLength(
                start,
                pose.target,
                startHeadingDeg,
                pose.targetHeading,
                radius
            )
        })).filter(pose => Number.isFinite(pose.rankLengthPx))
            .sort((a, b) => a.rankLengthPx - b.rankLengthPx);
        if (ranked.length <= maximumCandidates) return ranked;

        const selected = new Map();
        const addPose = (pose) => {
            if (!pose || selected.size >= maximumCandidates) return;
            selected.set(`${pose.circuitIndex}:${pose.circuitDirection}`, pose);
        };

        // Most feasible connectors are among the globally shortest poses.
        ranked.slice(0, Math.max(12, Math.floor(maximumCandidates / 2))).forEach(addPose);

        // Retain both ring directions even when one direction has a slightly
        // shorter unconstrained path but is blocked by the field boundary.
        [1, -1].forEach(direction => {
            ranked.filter(pose => pose.circuitDirection === direction)
                .slice(0, 4)
                .forEach(addPose);
        });

        // Keep one candidate per ring quadrant and traversal direction. This
        // prevents a cluster of nearby-but-unsafe targets from hiding a safe
        // connector on another edge of a concave headland.
        [1, -1].forEach(direction => {
            for (let sector = 0; sector < 4; sector += 1) {
                const sectorStart = sector * circuitLength / 4;
                const sectorEnd = (sector + 1) * circuitLength / 4;
                addPose(ranked.find(pose => pose.circuitDirection === direction
                    && pose.circuitIndex >= sectorStart
                    && pose.circuitIndex < sectorEnd));
            }
        });

        ranked.forEach(addPose);
        return [...selected.values()].sort((a, b) => a.rankLengthPx - b.rankLengthPx);
    };

    const headlandAttemptCount = (span, radius) => Math.min(
        48,
        Math.max(12, Math.ceil(span / Math.max(1, radius / 2)))
    );

    const sampleDubinsCandidate = (start, end, startHeadingDeg, endHeadingDeg, radius, candidate) => {
        let x = start.x;
        let y = -start.y;
        let heading = (90 - startHeadingDeg) * Math.PI / 180;
        const points = [{ ...start }];
        const append = (standardX, standardY) => {
            const point = { x: standardX, y: -standardY };
            if (distance(points[points.length - 1], point) > EPSILON) points.push(point);
        };
        candidate.word.split('').forEach((command, commandIndex) => {
            const amount = candidate.values[commandIndex];
            if (command === 'S') {
                const length = amount * radius;
                const steps = Math.max(1, Math.ceil(length / 3));
                const startX = x;
                const startY = y;
                for (let step = 1; step <= steps; step += 1) {
                    const travelled = length * (step / steps);
                    append(startX + Math.cos(heading) * travelled, startY + Math.sin(heading) * travelled);
                }
                x = startX + Math.cos(heading) * length;
                y = startY + Math.sin(heading) * length;
                return;
            }
            const turnSign = command === 'L' ? 1 : -1;
            const center = command === 'L'
                ? { x: x - Math.sin(heading) * radius, y: y + Math.cos(heading) * radius }
                : { x: x + Math.sin(heading) * radius, y: y - Math.cos(heading) * radius };
            const steps = Math.max(1, Math.ceil(amount / arcStep(radius)));
            for (let step = 1; step <= steps; step += 1) {
                const nextHeading = heading + turnSign * amount * (step / steps);
                if (command === 'L') {
                    append(center.x + Math.sin(nextHeading) * radius, center.y - Math.cos(nextHeading) * radius);
                } else {
                    append(center.x - Math.sin(nextHeading) * radius, center.y + Math.cos(nextHeading) * radius);
                }
            }
            heading += turnSign * amount;
            if (command === 'L') {
                x = center.x + Math.sin(heading) * radius;
                y = center.y - Math.cos(heading) * radius;
            } else {
                x = center.x - Math.sin(heading) * radius;
                y = center.y + Math.cos(heading) * radius;
            }
        });
        const expectedHeading = (90 - endHeadingDeg) * Math.PI / 180;
        const headingError = Math.abs(Math.atan2(
            Math.sin(heading - expectedHeading),
            Math.cos(heading - expectedHeading)
        ));
        if (distance({ x, y: -y }, end) > 1e-3 || headingError > 1e-5) return null;
        points[points.length - 1] = { ...end };
        return points;
    };

    const planDubinsConnector = ({
        start,
        end,
        startHeadingDeg,
        endHeadingDeg,
        radius,
        polygon,
        safetyMargin,
        maximumBoundaryDepth
    }) => {
        if (!isPoint(start) || !isPoint(end) || !(radius > EPSILON)) return null;
        const dx = end.x - start.x;
        const dy = -(end.y - start.y);
        const normalizedDistance = Math.hypot(dx, dy) / radius;
        const lineAngle = Math.atan2(dy, dx);
        const startHeading = (90 - startHeadingDeg) * Math.PI / 180;
        const endHeading = (90 - endHeadingDeg) * Math.PI / 180;
        const candidates = dubinsCandidates(
            positiveAngle(startHeading - lineAngle),
            positiveAngle(endHeading - lineAngle),
            normalizedDistance
        ).sort((a, b) => (
            a.values.reduce((sum, value) => sum + value, 0)
            - b.values.reduce((sum, value) => sum + value, 0)
        ));
        for (const candidate of candidates) {
            const points = sampleDubinsCandidate(
                cleanPoint(start),
                cleanPoint(end),
                normalizeHeadingDeg(startHeadingDeg),
                normalizeHeadingDeg(endHeadingDeg),
                radius,
                candidate
            );
            if (!points || !strictPathInsidePolygon(points, polygon, safetyMargin)) continue;
            if (Number.isFinite(maximumBoundaryDepth)
                && !pathWithinBoundaryBand(points, polygon, maximumBoundaryDepth)) continue;
            return {
                points,
                word: candidate.word,
                lengthPx: pathLength(points),
                radiusPx: radius
            };
        }
        return null;
    };

    const buildRoundedClosedPath = (
        ringPoints,
        radius,
        polygon,
        safetyMargin,
        maximumBoundaryDepth
    ) => {
        const ring = cleanPolygon(ringPoints);
        if (!isSimplePolygon(ring) || !(radius > EPSILON)) return null;
        const corners = [];
        for (let index = 0; index < ring.length; index += 1) {
            const previous = ring[(index - 1 + ring.length) % ring.length];
            const vertex = ring[index];
            const next = ring[(index + 1) % ring.length];
            const incomingLength = distance(previous, vertex);
            const outgoingLength = distance(vertex, next);
            if (incomingLength <= EPSILON || outgoingLength <= EPSILON) return null;
            const incoming = {
                x: (vertex.x - previous.x) / incomingLength,
                y: (vertex.y - previous.y) / incomingLength
            };
            const outgoing = {
                x: (next.x - vertex.x) / outgoingLength,
                y: (next.y - vertex.y) / outgoingLength
            };
            const signedTurn = Math.atan2(
                incoming.x * outgoing.y - incoming.y * outgoing.x,
                clamp(dot(incoming, outgoing), -1, 1)
            );
            if (Math.abs(signedTurn) >= Math.PI - 1e-4) return null;
            const tangentOffset = Math.abs(signedTurn) <= 1e-5
                ? 0
                : radius * Math.tan(Math.abs(signedTurn) / 2);
            if (!Number.isFinite(tangentOffset)) return null;
            const tangentIn = addScaled(vertex, incoming, -tangentOffset);
            const tangentOut = addScaled(vertex, outgoing, tangentOffset);
            let center = null;
            let sweep = 0;
            if (tangentOffset > EPSILON) {
                const turnNormal = signedTurn > 0
                    ? { x: -incoming.y, y: incoming.x }
                    : { x: incoming.y, y: -incoming.x };
                center = addScaled(tangentIn, turnNormal, radius);
                const startAngle = Math.atan2(tangentIn.y - center.y, tangentIn.x - center.x);
                const endAngle = Math.atan2(tangentOut.y - center.y, tangentOut.x - center.x);
                sweep = signedTurn > 0
                    ? counterClockwiseSweep(startAngle, endAngle)
                    : clockwiseSweep(startAngle, endAngle);
                corners.push({ tangentIn, tangentOut, center, startAngle, sweep, tangentOffset });
            } else {
                corners.push({ tangentIn, tangentOut, center, startAngle: 0, sweep: 0, tangentOffset });
            }
        }
        for (let index = 0; index < ring.length; index += 1) {
            const edgeLength = distance(ring[index], ring[(index + 1) % ring.length]);
            if (corners[index].tangentOffset
                + corners[(index + 1) % ring.length].tangentOffset > edgeLength - EPSILON) return null;
        }

        const points = [];
        const append = point => {
            if (!points.length || distance(points[points.length - 1], point) > EPSILON) {
                points.push(cleanPoint(point));
            }
        };
        corners.forEach(corner => {
            append(corner.tangentIn);
            if (!corner.center || Math.abs(corner.sweep) <= EPSILON) {
                append(corner.tangentOut);
                return;
            }
            const steps = Math.max(1, Math.ceil(Math.abs(corner.sweep) / arcStep(radius)));
            for (let step = 1; step <= steps; step += 1) {
                const angle = corner.startAngle + corner.sweep * (step / steps);
                append({
                    x: corner.center.x + Math.cos(angle) * radius,
                    y: corner.center.y + Math.sin(angle) * radius
                });
            }
        });
        append(points[0]);
        if (!strictPathInsidePolygon(points, polygon, safetyMargin)) return null;
        if (Number.isFinite(maximumBoundaryDepth)
            && !pathWithinBoundaryBand(points, polygon, maximumBoundaryDepth)) return null;
        return points;
    };

    const shortestSafeTransit = (
        start,
        end,
        candidatePoints,
        polygon,
        safetyMargin,
        maximumBoundaryDepth = Infinity
    ) => {
        const constrainToBoundaryBand = Number.isFinite(maximumBoundaryDepth);
        const edgeAllowed = (edgeStart, edgeEnd) => (
            segmentStrictlyInsidePolygon(edgeStart, edgeEnd, polygon, safetyMargin)
            && (!constrainToBoundaryBand
                || pathWithinBoundaryBand([edgeStart, edgeEnd], polygon, maximumBoundaryDepth))
        );
        if (edgeAllowed(start, end)) return [start, end];
        const rawCandidates = Array.isArray(candidatePoints) ? candidatePoints.filter(isPoint).map(cleanPoint) : [];
        const stride = Math.max(1, Math.ceil(rawCandidates.length / 256));
        const nodes = [start, end];
        rawCandidates.forEach((point, index) => {
            if (index % stride !== 0) return;
            if (!isPointInPolygon(point, polygon)
                || distanceToPolygonEdge(point, polygon) + EPSILON < safetyMargin) return;
            if (constrainToBoundaryBand
                && distanceToPolygonEdge(point, polygon) > maximumBoundaryDepth + EPSILON) return;
            if (!nodes.some(existing => distance(existing, point) <= 0.25)) nodes.push(point);
        });
        if (nodes.length <= 2) return null;

        const costs = new Array(nodes.length).fill(Infinity);
        const previous = new Array(nodes.length).fill(-1);
        const visited = new Array(nodes.length).fill(false);
        costs[0] = 0;
        for (let iteration = 0; iteration < nodes.length; iteration += 1) {
            let current = -1;
            for (let index = 0; index < nodes.length; index += 1) {
                if (!visited[index] && (current < 0 || costs[index] < costs[current])) current = index;
            }
            if (current < 0 || !Number.isFinite(costs[current])) break;
            if (current === 1) break;
            visited[current] = true;
            for (let next = 0; next < nodes.length; next += 1) {
                if (visited[next] || next === current) continue;
                const edgeLength = distance(nodes[current], nodes[next]);
                if (costs[current] + edgeLength + EPSILON >= costs[next]) continue;
                if (!edgeAllowed(nodes[current], nodes[next])) continue;
                costs[next] = costs[current] + edgeLength;
                previous[next] = current;
            }
        }
        if (!Number.isFinite(costs[1])) return null;
        const path = [];
        let cursor = 1;
        while (cursor >= 0) {
            path.push(nodes[cursor]);
            if (cursor === 0) break;
            cursor = previous[cursor];
        }
        path.reverse();
        return path[0] === nodes[0] && strictPathInsidePolygon(path, polygon, safetyMargin) ? path : null;
    };

    const planSmartFieldRoute = (options = {}) => {
        const rawBoundaryPoints = options.boundaryPoints;
        const polygon = cleanPolygon(rawBoundaryPoints);
        const position = isPoint(options.position) ? cleanPoint(options.position) : null;
        const referencePoint = isPoint(options.referencePoint) ? cleanPoint(options.referencePoint) : null;
        const headingDeg = finiteNumber(options.headingDeg, NaN);
        const referenceHeadingDeg = finiteNumber(options.referenceHeadingDeg, NaN);
        const laneSpacingPx = finiteNumber(options.laneSpacingPx, NaN);
        const currentLaneIndex = Math.round(finiteNumber(options.currentLaneIndex, NaN));
        const minimumRadius = finiteNumber(options.minRadiusPx, NaN);
        const safetyMargin = finiteNumber(options.safetyMarginPx, NaN);
        const workingWidth = Math.max(
            EPSILON,
            finiteNumber(options.workingWidthPx, laneSpacingPx)
        );
        const implementWorkOffset = Math.max(0, finiteNumber(options.implementWorkOffsetPx));
        const requiredCoverageRatio = clamp(
            finiteNumber(options.requiredCoverageRatio, 0.98),
            0.5,
            1
        );
        const smartTurnPattern = String(options.turnPattern || '').trim().toUpperCase() === 'FISH_TAIL'
            ? 'FISH_TAIL'
            : 'AUTO';
        const preferredDirection = String(options.preferredDirection || '').trim().toUpperCase();
        const laneDirection = preferredDirection.includes('LEFT') || finiteNumber(options.preferredDirection, 1) < 0 ? -1 : 1;
        const completedLaneIndices = new Set((Array.isArray(options.completedLaneIndices)
            ? options.completedLaneIndices
            : []).map(value => Math.round(finiteNumber(value, NaN))).filter(Number.isFinite));
        const rawWorkedLaneIntervals = options.workedLaneIntervals;
        const workedIntervalsValid = rawWorkedLaneIntervals === undefined
            || (Array.isArray(rawWorkedLaneIntervals) && rawWorkedLaneIntervals.every(entry => (
                entry
                && Number.isFinite(Number(entry.laneIndex))
                && Array.isArray(entry.intervals)
                && entry.intervals.every(interval => Array.isArray(interval)
                    && interval.length >= 2
                    && Number.isFinite(Number(interval[0]))
                    && Number.isFinite(Number(interval[1])))
            )));
        const workedIntervalsByLane = new Map();
        if (workedIntervalsValid && Array.isArray(rawWorkedLaneIntervals)) {
            rawWorkedLaneIntervals.forEach(entry => {
                const laneIndex = Math.round(Number(entry.laneIndex));
                const existing = workedIntervalsByLane.get(laneIndex) || [];
                workedIntervalsByLane.set(laneIndex, existing.concat(entry.intervals));
            });
        }
        const invalidResult = (failReason, points = position ? [position] : []) => ({
            feasible: false,
            failReason,
            points,
            segments: [],
            lanes: [],
            turnCount: 0,
            remainingPassCount: 0,
            skippedWorkedLaneIndices: [],
            targetLaneIndex: null,
            targetHeading: null,
            estimatedDistancePx: 0
        });

        if (!position || !referencePoint || !Number.isFinite(headingDeg)
            || !Number.isFinite(referenceHeadingDeg) || !Number.isFinite(currentLaneIndex)) {
            return invalidResult('INVALID_POSE');
        }
        if (!workedIntervalsValid) return invalidResult('INVALID_WORKED_INTERVALS');
        if (!Array.isArray(rawBoundaryPoints)
            || rawBoundaryPoints.length < 3
            || rawBoundaryPoints.some(point => !isPoint(point))) {
            return invalidResult('INVALID_BOUNDARY');
        }
        if (!isSimplePolygon(polygon)) return invalidResult('INVALID_BOUNDARY');
        if (!(laneSpacingPx > EPSILON) || !(minimumRadius > EPSILON)
            || !(safetyMargin >= 0)) return invalidResult('INVALID_DIMENSIONS');
        // Interior portions deeper than this band are working rows. Transit may
        // cross a completed row only inside this headland zone.
        const headlandBandDepth = safetyMargin + Math.max(
            // A one-sided keyhole can sweep laterally to 2R while its tractor
            // centre reaches R forward of the trigger. Keep a conservative 3R
            // band for the implement envelope and safety clearance.
            minimumRadius * 3,
            laneSpacingPx * 1.5
        );
        const xs = polygon.map(point => point.x);
        const ys = polygon.map(point => point.y);
        const diagonal = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        if (!Number.isFinite(diagonal) || diagonal > 1e7) return invalidResult('INVALID_DIMENSIONS');
        if (!isPointInPolygon(position, polygon)
            || distanceToPolygonEdge(position, polygon) + EPSILON < safetyMargin) {
            return invalidResult('UNSAFE_START');
        }

        const referenceHeading = referenceHeadingDeg * Math.PI / 180;
        const forward = { x: Math.sin(referenceHeading), y: -Math.cos(referenceHeading) };
        const normal = { x: Math.cos(referenceHeading), y: Math.sin(referenceHeading) };
        const offsets = polygon.map(point => dot({
            x: point.x - referencePoint.x,
            y: point.y - referencePoint.y
        }, normal));
        const minimumLaneIndex = Math.ceil((Math.min(...offsets) - EPSILON) / laneSpacingPx);
        const maximumLaneIndex = Math.floor((Math.max(...offsets) + EPSILON) / laneSpacingPx);
        const minimumFieldOffset = Math.min(...offsets);
        const maximumFieldOffset = Math.max(...offsets);
        const requiredSideTurnClearance = safetyMargin + Math.max(
            0,
            minimumRadius - laneSpacingPx / 2
        );
        const requestedHeadlandRing = cleanPolygon(options.headlandPathPoints);
        const requestedWorkEnvelope = cleanPolygon(options.workEnvelopePathPoints);
        const workEnvelopePolygon = isSimplePolygon(requestedWorkEnvelope)
            ? requestedWorkEnvelope
            : isSimplePolygon(requestedHeadlandRing)
                ? requestedHeadlandRing
                : null;
        const requestedHeadlandRings = (Array.isArray(options.headlandPathRings)
            ? options.headlandPathRings
            : requestedHeadlandRing.length ? [requestedHeadlandRing] : [])
            .map(cleanPolygon)
            .filter(ring => ring.length >= 3);
        const autoCloseHeadland = options.autoCloseHeadland === undefined
            ? requestedHeadlandRings.length > 0
            : Boolean(options.autoCloseHeadland);
        if (maximumLaneIndex - minimumLaneIndex > 2048) return invalidResult('TOO_MANY_LANES');

        const lanes = [];
        // Keep the physical work-envelope fragments separate from residual
        // WORK fragments. A pose can legitimately sit on already-worked
        // coverage that was subtracted from `lanes`; that physical lane is
        // still required for an implement-up exit to the headland.
        const workEnvelopeLaneFragments = [];
        for (let laneIndex = minimumLaneIndex; laneIndex <= maximumLaneIndex; laneIndex += 1) {
            const laneOrigin = addScaled(referencePoint, normal, laneIndex * laneSpacingPx);
            const intervals = linePolygonIntervals(
                referencePoint, forward, normal, laneIndex * laneSpacingPx, polygon
            );
            const workEnvelopeIntervals = workEnvelopePolygon
                ? linePolygonIntervals(
                    referencePoint,
                    forward,
                    normal,
                    laneIndex * laneSpacingPx,
                    workEnvelopePolygon
                )
                : null;
            let fragmentIndex = 0;
            intervals.forEach(interval => {
                safeLaneFragments(laneOrigin, forward, interval, polygon, safetyMargin).forEach(safeFragment => {
                    const envelopeFragments = workEnvelopeIntervals
                        ? workEnvelopeIntervals.map(envelope => ({
                            minT: Math.max(safeFragment.minT, envelope.minT + 0.01),
                            maxT: Math.min(safeFragment.maxT, envelope.maxT - 0.01)
                        })).filter(fragment => fragment.maxT - fragment.minT > EPSILON)
                        : [safeFragment];
                    const laneCompleted = completedLaneIndices.has(laneIndex);
                    const workedIntervals = workedIntervalsByLane.get(laneIndex) || [];
                    envelopeFragments.forEach((fragment, envelopeFragmentIndex) => {
                        workEnvelopeLaneFragments.push({
                            laneIndex,
                            fragmentIndex: envelopeFragmentIndex,
                            minT: fragment.minT,
                            maxT: fragment.maxT,
                            workEnvelopeMinT: fragment.minT,
                            workEnvelopeMaxT: fragment.maxT,
                            startPoint: addScaled(laneOrigin, forward, fragment.minT),
                            endPoint: addScaled(laneOrigin, forward, fragment.maxT),
                            lengthPx: fragment.maxT - fragment.minT,
                            physicalEnvelopeOnly: true
                        });
                    });
                    const fragments = envelopeFragments.flatMap(fragment => (
                        laneCompleted
                            ? [fragment]
                            : subtractWorkedIntervals(fragment, workedIntervals)
                    ));
                    fragments.forEach(fragment => {
                    const sourceEnvelope = envelopeFragments.find(envelope => (
                        fragment.minT >= envelope.minT - EPSILON
                        && fragment.maxT <= envelope.maxT + EPSILON
                    )) || fragment;
                    const startPoint = addScaled(laneOrigin, forward, fragment.minT);
                    const endPoint = addScaled(laneOrigin, forward, fragment.maxT);
                    const laneOffset = laneIndex * laneSpacingPx;
                    const sideTurnClearance = Math.min(
                        laneOffset - minimumFieldOffset,
                        maximumFieldOffset - laneOffset
                    );
                    const turnEnvelopeAvailable = sideTurnClearance + EPSILON >= requiredSideTurnClearance;
                    lanes.push({
                        laneIndex,
                        fragmentIndex,
                        minT: fragment.minT,
                        maxT: fragment.maxT,
                        workEnvelopeMinT: sourceEnvelope.minT,
                        workEnvelopeMaxT: sourceEnvelope.maxT,
                        startPoint,
                        endPoint,
                        lengthPx: fragment.maxT - fragment.minT,
                        completed: laneCompleted,
                        partiallyWorked: !laneCompleted && fragments.length !== 1
                            || (!laneCompleted && workedIntervals.length > 0),
                        viable: turnEnvelopeAvailable
                            && fragment.maxT - fragment.minT >= Math.max(laneSpacingPx, minimumRadius),
                        turnEnvelopeAvailable,
                        sideTurnClearancePx: sideTurnClearance,
                        exclusionReason: turnEnvelopeAvailable ? null : 'HEADLAND_TURN_ENVELOPE',
                        routeOrder: null
                    });
                    fragmentIndex += 1;
                    });
                });
            });
        }

        const skippedWorkedLaneIndices = [...new Set(lanes
            .filter(lane => lane.completed)
            .map(lane => lane.laneIndex))].sort((a, b) => a - b);
        // Coverage history is expressed in the guidance-line coordinate system,
        // but the thing doing the work is the offset implement bar. Keep one
        // physical overlap oracle for every route branch (including the early
        // "all rows complete" headland-only branch) so an active implement can
        // never sweep a completed interval.
        const protectedCoverageByLane = new Map();
        const addProtectedInterval = (laneIndex, minT, maxT) => {
            if (!Number.isFinite(laneIndex) || !Number.isFinite(minT) || !Number.isFinite(maxT)) return;
            const interval = {
                minT: Math.min(minT, maxT),
                maxT: Math.max(minT, maxT)
            };
            if (interval.maxT - interval.minT <= EPSILON) return;
            const existing = protectedCoverageByLane.get(laneIndex) || [];
            existing.push(interval);
            protectedCoverageByLane.set(laneIndex, existing);
        };
        lanes.filter(lane => lane.completed).forEach(lane => {
            addProtectedInterval(lane.laneIndex, lane.minT, lane.maxT);
        });
        workedIntervalsByLane.forEach((intervals, laneIndex) => {
            intervals.forEach(interval => {
                addProtectedInterval(laneIndex, Number(interval[0]), Number(interval[1]));
            });
        });
        protectedCoverageByLane.forEach((intervals, laneIndex) => {
            const merged = intervals
                .sort((a, b) => a.minT - b.minT)
                .reduce((result, interval) => {
                    const previous = result[result.length - 1];
                    if (previous && interval.minT <= previous.maxT + EPSILON) {
                        previous.maxT = Math.max(previous.maxT, interval.maxT);
                    } else result.push({ ...interval });
                    return result;
                }, []);
            protectedCoverageByLane.set(laneIndex, merged);
        });
        // A tiny guard keeps floating-point split points on the raised side of
        // a previous-work boundary. This is far below both GNSS resolution and
        // the 0.05 px coverage-audit merge tolerance.
        const protectedCoverageGuardPx = Math.max(
            EPSILON * 10,
            Math.min(0.01, workingWidth * 1e-3)
        );
        const getToolBar = (point, vehicleHeadingDeg) => {
            const headingRadians = vehicleHeadingDeg * Math.PI / 180;
            const vehicleForward = {
                x: Math.sin(headingRadians),
                y: -Math.cos(headingRadians)
            };
            const vehicleRight = {
                x: Math.cos(headingRadians),
                y: Math.sin(headingRadians)
            };
            const center = addScaled(point, vehicleForward, -implementWorkOffset);
            return {
                left: addScaled(center, vehicleRight, -workingWidth / 2),
                right: addScaled(center, vehicleRight, workingWidth / 2)
            };
        };
        const toolBarOverlapsProtectedCoverage = (point, vehicleHeadingDeg) => {
            if (!protectedCoverageByLane.size || !isPoint(point)) return false;
            const bar = getToolBar(point, vehicleHeadingDeg);
            const localPoint = candidate => ({
                s: dot({
                    x: candidate.x - referencePoint.x,
                    y: candidate.y - referencePoint.y
                }, normal),
                t: dot({
                    x: candidate.x - referencePoint.x,
                    y: candidate.y - referencePoint.y
                }, forward)
            });
            const left = localPoint(bar.left);
            const right = localPoint(bar.right);
            const minimumOffset = Math.min(left.s, right.s);
            const maximumOffset = Math.max(left.s, right.s);
            const firstLaneIndex = Math.ceil((minimumOffset - EPSILON) / laneSpacingPx);
            const lastLaneIndex = Math.floor((maximumOffset + EPSILON) / laneSpacingPx);
            for (let laneIndex = firstLaneIndex; laneIndex <= lastLaneIndex; laneIndex += 1) {
                const protectedIntervals = protectedCoverageByLane.get(laneIndex);
                if (!protectedIntervals) continue;
                const laneOffset = laneIndex * laneSpacingPx;
                const offsetDelta = right.s - left.s;
                if (Math.abs(offsetDelta) <= EPSILON) {
                    if (Math.abs(left.s - laneOffset) > EPSILON) continue;
                    const minimumT = Math.min(left.t, right.t);
                    const maximumT = Math.max(left.t, right.t);
                    if (protectedIntervals.some(interval => (
                        Math.min(maximumT, interval.maxT + protectedCoverageGuardPx)
                            - Math.max(minimumT, interval.minT - protectedCoverageGuardPx) > EPSILON
                    ))) return true;
                    continue;
                }
                const ratio = (laneOffset - left.s) / offsetDelta;
                if (ratio < -EPSILON || ratio > 1 + EPSILON) continue;
                const laneT = left.t + (right.t - left.t) * clamp(ratio, 0, 1);
                if (protectedIntervals.some(interval => (
                    laneT > interval.minT - protectedCoverageGuardPx + EPSILON
                        && laneT < interval.maxT + protectedCoverageGuardPx - EPSILON
                ))) return true;
            }
            return false;
        };
        const edgeOverlapsProtectedCoverage = (from, to, vehicleHeadingDeg) => {
            if (!protectedCoverageByLane.size || !isPoint(from) || !isPoint(to)) return false;
            const first = getToolBar(from, vehicleHeadingDeg);
            const second = getToolBar(to, vehicleHeadingDeg);
            const sweepTriangles = [
                [first.left, second.left, second.right],
                [first.left, second.right, first.right]
            ].filter(triangle => Math.abs(polygonSignedArea(triangle)) > EPSILON);
            for (const triangle of sweepTriangles) {
                const offsets = triangle.map(point => dot({
                    x: point.x - referencePoint.x,
                    y: point.y - referencePoint.y
                }, normal));
                const firstLaneIndex = Math.ceil((Math.min(...offsets) - EPSILON) / laneSpacingPx);
                const lastLaneIndex = Math.floor((Math.max(...offsets) + EPSILON) / laneSpacingPx);
                for (let laneIndex = firstLaneIndex; laneIndex <= lastLaneIndex; laneIndex += 1) {
                    const protectedIntervals = protectedCoverageByLane.get(laneIndex);
                    if (!protectedIntervals) continue;
                    const sweptIntervals = linePolygonIntervals(
                        referencePoint,
                        forward,
                        normal,
                        laneIndex * laneSpacingPx,
                        triangle
                    );
                    if (sweptIntervals.some(swept => protectedIntervals.some(protectedInterval => (
                        Math.min(
                            swept.maxT,
                            protectedInterval.maxT + protectedCoverageGuardPx
                        ) - Math.max(
                            swept.minT,
                            protectedInterval.minT - protectedCoverageGuardPx
                        ) > EPSILON
                    )))) return true;
                }
            }
            return false;
        };
        const splitProtectedAwareCoveragePath = (path, metadata = {}) => {
            const cleanPath = (Array.isArray(path) ? path : []).filter(isPoint).map(cleanPoint);
            if (cleanPath.length < 2) return [];
            const runs = [];
            const appendEdge = (from, to, coverageActive, headingDeg) => {
                if (distance(from, to) <= EPSILON) return;
                const previous = runs[runs.length - 1];
                if (previous
                    && previous.coverageActive === coverageActive
                    && Math.abs(((previous.headingDeg - headingDeg + 540) % 360) - 180) <= EPSILON
                    && distance(previous.points[previous.points.length - 1], from) <= EPSILON) {
                    previous.points.push(to);
                } else {
                    runs.push({
                        points: [from, to],
                        coverageActive,
                        headingDeg
                    });
                }
            };
            const classifyEdge = (from, to, vehicleHeadingDeg, depth = 0) => {
                if (!edgeOverlapsProtectedCoverage(from, to, vehicleHeadingDeg)) {
                    appendEdge(from, to, true, vehicleHeadingDeg);
                    return;
                }
                const startBlocked = toolBarOverlapsProtectedCoverage(from, vehicleHeadingDeg);
                const endBlocked = toolBarOverlapsProtectedCoverage(to, vehicleHeadingDeg);
                // A sampled edge wholly inside protected work can be lifted as
                // one run. Mixed edges are bisected to the physical toolbar
                // crossing, retaining sub-pixel coverage at interval borders.
                if ((startBlocked && endBlocked)
                    || depth >= 48
                    || distance(from, to) <= 1e-8) {
                    appendEdge(from, to, false, vehicleHeadingDeg);
                    return;
                }
                const midpoint = {
                    x: (from.x + to.x) / 2,
                    y: (from.y + to.y) / 2
                };
                classifyEdge(from, midpoint, vehicleHeadingDeg, depth + 1);
                classifyEdge(midpoint, to, vehicleHeadingDeg, depth + 1);
            };
            for (let index = 0; index < cleanPath.length - 1; index += 1) {
                const from = cleanPath[index];
                const to = cleanPath[index + 1];
                if (distance(from, to) <= EPSILON) continue;
                const vehicleHeadingDeg = Number.isFinite(Number(metadata.headingDeg))
                    ? normalizeHeadingDeg(Number(metadata.headingDeg))
                    : normalizeHeadingDeg(Math.atan2(
                        to.x - from.x,
                        -(to.y - from.y)
                    ) * 180 / Math.PI);
                classifyEdge(from, to, vehicleHeadingDeg);
            }
            return runs;
        };
        const viableLanes = lanes.filter(lane => lane.viable);
        const remaining = viableLanes.filter(lane => !lane.completed);
        if (remaining.length === 0) {
            // An empty plan only means "field complete" when there were viable
            // passes and every one was explicitly marked worked. A field eroded
            // away by clearance/radius constraints must fail closed instead.
            if (viableLanes.length === 0) {
                return {
                    ...invalidResult('NO_VIABLE_LANES'),
                    lanes,
                    skippedWorkedLaneIndices
                };
            }
            if (requestedHeadlandRings.length > 0) {
                const rings = requestedHeadlandRings;
                if (rings.some(ring => (
                    !isSimplePolygon(ring)
                    || !strictPathInsidePolygon([...ring, ring[0]], polygon, safetyMargin)
                ))) {
                    return {
                        ...invalidResult('UNSAFE_HEADLAND_PATH'),
                        lanes,
                        skippedWorkedLaneIndices
                    };
                }
                const vehicleHeading = headingDeg * Math.PI / 180;
                const vehicleForward = { x: Math.sin(vehicleHeading), y: -Math.cos(vehicleHeading) };
                const travelSign = dot(vehicleForward, forward) >= 0 ? 1 : -1;
                const currentOrigin = addScaled(referencePoint, normal, currentLaneIndex * laneSpacingPx);
                const currentOffset = { x: position.x - currentOrigin.x, y: position.y - currentOrigin.y };
                const currentT = dot(currentOffset, forward);
                const currentCrossTrack = Math.abs(dot(currentOffset, normal));
                const currentFragment = currentCrossTrack <= laneSpacingPx * 0.75 + EPSILON
                    ? lanes.filter(lane => lane.laneIndex === currentLaneIndex
                        && currentT >= lane.minT - EPSILON
                        && currentT <= lane.maxT + EPSILON)
                        .sort((a, b) => b.lengthPx - a.lengthPx)[0] || null
                    : null;
                if (!currentFragment) {
                    return {
                        ...invalidResult('NO_SAFE_HEADLAND_ENTRY'),
                        lanes,
                        skippedWorkedLaneIndices
                    };
                }
                const ringDepth = rings.reduce((ringMaximum, ring) => Math.max(
                    ringMaximum,
                    ring.reduce((maximum, point) => Math.max(
                        maximum,
                        distanceToPolygonEdge(point, polygon)
                    ), 0)
                ), 0);
                const explicitHeadlandDepth = Math.max(
                    headlandBandDepth,
                    ringDepth + laneSpacingPx
                );
                const roundedCircuits = rings.map(ring => buildRoundedClosedPath(
                    ring,
                    minimumRadius,
                    polygon,
                    safetyMargin,
                    explicitHeadlandDepth
                ));
                if (roundedCircuits.some(circuit => !Array.isArray(circuit) || circuit.length < 4)) {
                    return {
                        ...invalidResult('UNSAFE_HEADLAND_PATH'),
                        lanes,
                        skippedWorkedLaneIndices
                    };
                }
                const circuit = roundedCircuits[roundedCircuits.length - 1].slice(0, -1);
                const lower = travelSign > 0 ? Math.max(currentFragment.minT, currentT) : currentFragment.minT;
                const upper = travelSign < 0 ? Math.min(currentFragment.maxT, currentT) : currentFragment.maxT;
                const span = upper - lower;
                const attempts = headlandAttemptCount(span, minimumRadius);
                const startHeading = normalizeHeadingDeg(
                    referenceHeadingDeg + (travelSign < 0 ? 180 : 0)
                );
                const targetPoses = buildHeadlandTargetPoses(circuit);
                let selectedConnector = null;
                for (let attempt = 0; attempt <= attempts && !selectedConnector; attempt += 1) {
                    const ratio = attempt / attempts;
                    const candidateT = travelSign > 0 ? upper - span * ratio : lower + span * ratio;
                    const startPoint = addScaled(currentOrigin, forward, candidateT);
                    if (!segmentStrictlyInsidePolygon(position, startPoint, polygon, safetyMargin)) continue;
                    const candidates = [];
                    rankHeadlandTargetPoses(
                        targetPoses,
                        circuit.length,
                        startPoint,
                        startHeading,
                        minimumRadius
                    ).forEach(pose => {
                        const connector = planDubinsConnector({
                            start: startPoint,
                            end: pose.target,
                            startHeadingDeg: startHeading,
                            endHeadingDeg: pose.targetHeading,
                            radius: minimumRadius,
                            polygon,
                            safetyMargin,
                            maximumBoundaryDepth: explicitHeadlandDepth
                        });
                        if (connector) candidates.push({
                            ...connector,
                            startPoint,
                            circuitIndex: pose.circuitIndex,
                            circuitDirection: pose.circuitDirection,
                            targetHeading: pose.targetHeading
                        });
                    });
                    candidates.sort((a, b) => a.lengthPx - b.lengthPx);
                    selectedConnector = candidates[0] || null;
                }
                if (!selectedConnector) {
                    return {
                        ...invalidResult('NO_SAFE_HEADLAND_ENTRY'),
                        lanes,
                        skippedWorkedLaneIndices
                    };
                }
                const recommendationPoints = [];
                const recommendationSegments = [];
                const appendRecommendationPath = (path, metadata) => {
                    const cleanPath = (Array.isArray(path) ? path : []).filter(isPoint).map(cleanPoint);
                    if (cleanPath.length < 2) return;
                    if (!recommendationPoints.length) recommendationPoints.push(cleanPath[0]);
                    else if (distance(recommendationPoints[recommendationPoints.length - 1], cleanPath[0]) > EPSILON) {
                        recommendationPoints.push(cleanPath[0]);
                    }
                    const startIndex = recommendationPoints.length - 1;
                    cleanPath.slice(1).forEach(point => {
                        if (distance(recommendationPoints[recommendationPoints.length - 1], point) > EPSILON) {
                            recommendationPoints.push(point);
                        }
                    });
                    recommendationSegments.push({
                        startIndex,
                        endIndex: recommendationPoints.length - 1,
                        coverageActive: metadata.phase === 'HEADLAND_CLOSE',
                        implementDown: metadata.phase === 'HEADLAND_CLOSE',
                        ...metadata
                    });
                };
                const appendProtectedAwareRecommendationPath = (path, metadata) => {
                    splitProtectedAwareCoveragePath(path, metadata).forEach(run => {
                        appendRecommendationPath(run.points, {
                            ...metadata,
                            headingDeg: run.headingDeg,
                            coverageActive: run.coverageActive,
                            implementDown: run.coverageActive
                        });
                    });
                };
                if (distance(position, selectedConnector.startPoint) > EPSILON) {
                    appendRecommendationPath([position, selectedConnector.startPoint], {
                        phase: 'TRANSIT',
                        transitRole: 'CURRENT_LANE_EXIT',
                        fromLaneIndex: currentLaneIndex,
                        toLaneIndex: currentLaneIndex
                    });
                }
                appendRecommendationPath(selectedConnector.points, {
                    phase: 'TRANSIT',
                    transitRole: 'HEADLAND_ENTRY',
                    pathType: 'DUBINS',
                    fromLaneIndex: currentLaneIndex,
                    toLaneIndex: null,
                    minRadiusPx: minimumRadius
                });

                let selectedRingEntry = selectedConnector;
                let currentPoint = selectedConnector.points[selectedConnector.points.length - 1];
                let currentHeading = selectedConnector.targetHeading;
                let completedPasses = 0;
                for (let reverseIndex = roundedCircuits.length - 1; reverseIndex >= 0; reverseIndex -= 1) {
                    const currentCircuit = roundedCircuits[reverseIndex].slice(0, -1);
                    if (reverseIndex !== roundedCircuits.length - 1) {
                        const candidates = [];
                        rankHeadlandTargetPoses(
                            buildHeadlandTargetPoses(currentCircuit),
                            currentCircuit.length,
                            currentPoint,
                            currentHeading,
                            minimumRadius
                        ).forEach(pose => {
                            const connector = planDubinsConnector({
                                start: currentPoint,
                                end: pose.target,
                                startHeadingDeg: currentHeading,
                                endHeadingDeg: pose.targetHeading,
                                radius: minimumRadius,
                                polygon,
                                safetyMargin,
                                maximumBoundaryDepth: explicitHeadlandDepth
                            });
                            if (connector) candidates.push({
                                ...connector,
                                circuitIndex: pose.circuitIndex,
                                circuitDirection: pose.circuitDirection,
                                targetHeading: pose.targetHeading
                            });
                        });
                        candidates.sort((a, b) => a.lengthPx - b.lengthPx);
                        selectedRingEntry = candidates[0] || null;
                        if (!selectedRingEntry) {
                            return {
                                ...invalidResult('NO_SAFE_HEADLAND_RING_CONNECTOR'),
                                lanes,
                                skippedWorkedLaneIndices
                            };
                        }
                        appendRecommendationPath(selectedRingEntry.points, {
                            phase: 'TRANSIT',
                            transitRole: 'HEADLAND_RING_CHANGE',
                            pathType: 'DUBINS',
                            minRadiusPx: minimumRadius,
                            fromHeadlandPassIndex: completedPasses - 1,
                            toHeadlandPassIndex: completedPasses
                        });
                        currentPoint = selectedRingEntry.points[selectedRingEntry.points.length - 1];
                        currentHeading = selectedRingEntry.targetHeading;
                    }
                    const rotatedRing = [];
                    for (let index = 0; index < currentCircuit.length; index += 1) {
                        rotatedRing.push(currentCircuit[
                            (selectedRingEntry.circuitIndex
                                + selectedRingEntry.circuitDirection * index
                                + currentCircuit.length * 2) % currentCircuit.length
                        ]);
                    }
                    appendProtectedAwareRecommendationPath(
                        [currentPoint, ...rotatedRing.slice(1), rotatedRing[0]], {
                        phase: 'HEADLAND_CLOSE',
                        laneIndex: null,
                        headlandPassIndex: completedPasses,
                        sourceRingIndex: reverseIndex
                        }
                    );
                    currentPoint = rotatedRing[0];
                    currentHeading = selectedRingEntry.targetHeading;
                    completedPasses += 1;
                }
                const recommendation = {
                    points: recommendationPoints,
                    segments: recommendationSegments,
                    estimatedDistancePx: pathLength(recommendationPoints),
                    passCount: completedPasses
                };
                const automatedPoints = autoCloseHeadland ? recommendationPoints : [position];
                const automatedSegments = autoCloseHeadland ? recommendationSegments : [];
                return {
                    feasible: true,
                    failReason: null,
                    points: automatedPoints,
                    segments: automatedSegments,
                    lanes,
                    turnCount: 0,
                    remainingPassCount: 0,
                    skippedWorkedLaneIndices,
                    targetLaneIndex: null,
                    targetHeading: null,
                    estimatedDistancePx: pathLength(automatedPoints),
                    manualHeadlandRecommendation: autoCloseHeadland ? null : recommendation,
                    automatedHeadlandPlan: autoCloseHeadland ? recommendation : null,
                    headlandPassCount: completedPasses,
                    autoCloseHeadland,
                    coverageAudit: {
                        complete: true,
                        fieldComplete: !lanes.some(lane => !lane.viable && !lane.completed),
                        requiredCoverageRatio,
                        minimumCoverageRatio: 1,
                        minimumAllCoverageRatio: lanes.some(lane => !lane.viable && !lane.completed) ? 0 : 1,
                        manualLaneCoverage: lanes.filter(lane => !lane.viable && !lane.completed),
                        laneCoverage: []
                    }
                };
            }
            return {
                ...invalidResult(null),
                feasible: true,
                failReason: null,
                lanes,
                skippedWorkedLaneIndices
            };
        }

        const uniqueIndices = [...new Set(remaining.map(lane => lane.laneIndex))];
        const orderedIndices = uniqueIndices.sort(options.continuousLaneOrder
            ? (a, b) => (a - b) * laneDirection
            : (a, b) => {
                const sideRank = index => {
                    if (index === currentLaneIndex) return 0;
                    const delta = index - currentLaneIndex;
                    return Math.sign(delta) === laneDirection ? 1 : 2;
                };
                const rankDifference = sideRank(a) - sideRank(b);
                if (rankDifference) return rankDifference;
                const distanceDifference = Math.abs(a - currentLaneIndex) - Math.abs(b - currentLaneIndex);
                return distanceDifference || (a - b) * laneDirection;
            });
        const orderedLanes = [];
        orderedIndices.forEach(index => {
            const fragments = remaining.filter(lane => lane.laneIndex === index);
            fragments.sort((a, b) => {
                const aDistance = Math.min(distance(position, a.startPoint), distance(position, a.endPoint));
                const bDistance = Math.min(distance(position, b.startPoint), distance(position, b.endPoint));
                return aDistance - bDistance;
            });
            orderedLanes.push(...fragments);
        });
        // With no coverage proof behind the live pose, do not start WORK in
        // the middle of the current fragment. Approach the headland with the
        // implement raised, enter another pass, and schedule the entire current
        // lane later in the route.
        const initialHeadingRadians = headingDeg * Math.PI / 180;
        const initialVehicleForward = {
            x: Math.sin(initialHeadingRadians),
            y: -Math.cos(initialHeadingRadians)
        };
        const initialTravelSign = dot(initialVehicleForward, forward) >= 0 ? 1 : -1;
        const currentLaneOrigin = addScaled(referencePoint, normal, currentLaneIndex * laneSpacingPx);
        const currentPoseOffset = {
            x: position.x - currentLaneOrigin.x,
            y: position.y - currentLaneOrigin.y
        };
        const currentPoseT = dot(currentPoseOffset, forward);
        const currentPoseCrossTrack = Math.abs(dot(currentPoseOffset, normal));
        const currentPoseFragment = currentPoseCrossTrack <= laneSpacingPx * 0.75 + EPSILON
            ? orderedLanes.find(lane => lane.laneIndex === currentLaneIndex
                && currentPoseT >= lane.minT - EPSILON
                && currentPoseT <= lane.maxT + EPSILON) || null
            : null;
        const approachTolerance = Math.max(0.25, laneSpacingPx * 0.05);
        const coverageProvesBehind = currentPoseFragment && (initialTravelSign > 0
            ? currentPoseT <= currentPoseFragment.minT + approachTolerance
            : currentPoseT >= currentPoseFragment.maxT - approachTolerance);
        if (currentPoseFragment && coverageProvesBehind) {
            // A residual that begins at the live pose must be consumed first.
            // Otherwise a monotonic side-to-side sort can use that interior
            // residual endpoint as the turn point for the preceding full row,
            // truncating that row at the worked/unworked boundary.
            const remainingLanes = orderedLanes.filter(lane => lane !== currentPoseFragment);
            remainingLanes.sort((a, b) => {
                const sideRank = lane => {
                    const delta = lane.laneIndex - currentLaneIndex;
                    if (Math.sign(delta) === laneDirection) return 0;
                    if (delta !== 0) return 1;
                    return 2;
                };
                return sideRank(a) - sideRank(b)
                    || Math.abs(a.laneIndex - currentLaneIndex) - Math.abs(b.laneIndex - currentLaneIndex)
                    || (a.laneIndex - b.laneIndex) * laneDirection
                    || a.fragmentIndex - b.fragmentIndex;
            });
            orderedLanes.length = 0;
            orderedLanes.push(currentPoseFragment, ...remainingLanes);
        } else if (!options.continuousLaneOrder && currentPoseFragment && !coverageProvesBehind) {
            const deferredCurrentLane = orderedLanes.filter(lane => lane.laneIndex === currentLaneIndex);
            const otherLanes = orderedLanes.filter(lane => lane.laneIndex !== currentLaneIndex);
            if (otherLanes.length) {
                orderedLanes.length = 0;
                orderedLanes.push(...otherLanes, ...deferredCurrentLane);
            }
        }
        orderedLanes.forEach((lane, index) => { lane.routeOrder = index; });

        const polygonCentroid = polygon.reduce((sum, point) => ({
            x: sum.x + point.x / polygon.length,
            y: sum.y + point.y / polygon.length
        }), { x: 0, y: 0 });
        const transitWaypoints = lanes.flatMap(lane => [lane.startPoint, lane.endPoint]);
        polygon.forEach((vertex, index) => {
            const next = polygon[(index + 1) % polygon.length];
            const midpoint = { x: (vertex.x + next.x) / 2, y: (vertex.y + next.y) / 2 };
            [vertex, midpoint].forEach(anchor => {
                const towardCenter = {
                    x: polygonCentroid.x - anchor.x,
                    y: polygonCentroid.y - anchor.y
                };
                const magnitude = Math.hypot(towardCenter.x, towardCenter.y);
                if (magnitude <= EPSILON) return;
                const inward = { x: towardCenter.x / magnitude, y: towardCenter.y / magnitude };
                [safetyMargin + 2, safetyMargin * 2 + minimumRadius].forEach(inset => {
                    transitWaypoints.push(addScaled(anchor, inward, inset));
                });
            });
        });

        const routePoints = [];
        const segments = [];
        let turnSequenceCounter = 0;
        const appendPath = (path, metadata) => {
            const cleanPath = path.filter(isPoint).map(cleanPoint);
            if (cleanPath.length === 0) return;
            if (routePoints.length === 0) routePoints.push(cleanPath[0]);
            else if (distance(routePoints[routePoints.length - 1], cleanPath[0]) > 1e-4) {
                routePoints.push(cleanPath[0]);
            }
            const startIndex = Math.max(0, routePoints.length - 1);
            for (let index = 1; index < cleanPath.length; index += 1) {
                if (distance(routePoints[routePoints.length - 1], cleanPath[index]) > EPSILON) {
                    routePoints.push(cleanPath[index]);
                }
            }
            segments.push({
                startIndex,
                endIndex: routePoints.length - 1,
                coverageActive: metadata.coverageActive === undefined
                    ? metadata.phase === 'WORK' || metadata.phase === 'HEADLAND_CLOSE'
                    : Boolean(metadata.coverageActive),
                implementDown: metadata.implementDown === undefined
                    ? metadata.phase === 'WORK' || metadata.phase === 'HEADLAND_CLOSE'
                    : Boolean(metadata.implementDown),
                ...metadata
            });
        };
        const appendProtectedAwarePath = (path, metadata) => {
            splitProtectedAwareCoveragePath(path, metadata).forEach(run => {
                appendPath(run.points, {
                    ...metadata,
                    headingDeg: run.headingDeg,
                    coverageActive: run.coverageActive,
                    implementDown: run.coverageActive
                });
            });
        };
        const appendTurnPath = (turn, metadata) => {
            const turnPoints = Array.isArray(turn?.points) ? turn.points : [];
            if (turnPoints.length < 2) return;
            const turnSequenceId = turnSequenceCounter;
            turnSequenceCounter += 1;
            const turnSegments = Array.isArray(turn.segments) && turn.segments.length
                ? turn.segments
                : [{ startIndex: 0, endIndex: turnPoints.length - 1, gear: 'FORWARD' }];
            turnSegments.forEach((segment, segmentIndex) => {
                const startIndex = clamp(Math.round(finiteNumber(segment.startIndex)), 0, turnPoints.length - 1);
                const endIndex = clamp(
                    Math.round(finiteNumber(segment.endIndex, turnPoints.length - 1)),
                    startIndex,
                    turnPoints.length - 1
                );
                if (endIndex <= startIndex) return;
                const gear = segment.gear === 'REVERSE' ? 'REVERSE' : 'FORWARD';
                const edgeCoverageActive = (edgeIndex) => {
                    if (gear === 'REVERSE' || !workEnvelopePolygon) return false;
                    const from = turnPoints[edgeIndex];
                    const to = turnPoints[edgeIndex + 1];
                    if (!isPoint(from) || !isPoint(to) || distance(from, to) <= EPSILON) return false;
                    const motionHeading = normalizeHeadingDeg(Math.atan2(
                        to.x - from.x,
                        -(to.y - from.y)
                    ) * 180 / Math.PI);
                    const vehicleHeading = normalizeHeadingDeg(
                        motionHeading + (gear === 'REVERSE' ? 180 : 0)
                    );
                    const headingRadians = vehicleHeading * Math.PI / 180;
                    const vehicleForward = {
                        x: Math.sin(headingRadians),
                        y: -Math.cos(headingRadians)
                    };
                    const midpoint = {
                        x: (from.x + to.x) / 2,
                        y: (from.y + to.y) / 2
                    };
                    const workPoint = addScaled(midpoint, vehicleForward, -implementWorkOffset);
                    return isPointInPolygon(workPoint, workEnvelopePolygon)
                        && !edgeOverlapsProtectedCoverage(from, to, vehicleHeading);
                };
                let runStart = startIndex;
                let runCoverageActive = edgeCoverageActive(startIndex);
                for (let edgeIndex = startIndex + 1; edgeIndex < endIndex; edgeIndex += 1) {
                    const coverageActive = edgeCoverageActive(edgeIndex);
                    if (coverageActive === runCoverageActive) continue;
                    appendPath(turnPoints.slice(runStart, edgeIndex + 1), {
                        ...metadata,
                        gear,
                        coverageActive: runCoverageActive,
                        implementDown: runCoverageActive,
                        maneuverId: turnSequenceId,
                        turnSequenceId,
                        turnSequenceStep: segmentIndex,
                        turnSequenceSteps: turnSegments.length
                    });
                    runStart = edgeIndex;
                    runCoverageActive = coverageActive;
                }
                appendPath(turnPoints.slice(runStart, endIndex + 1), {
                    ...metadata,
                    gear,
                    coverageActive: runCoverageActive,
                    implementDown: runCoverageActive,
                    maneuverId: turnSequenceId,
                    turnSequenceId,
                    turnSequenceStep: segmentIndex,
                    turnSequenceSteps: turnSegments.length
                });
            });
        };
        const appendStagedLaneEntry = (
            path,
            metadata,
            targetLaneIndex,
            targetTravelSign,
            sourceLaneIndex = null,
            sourceTravelSign = null,
            allowEnvelopeStaging = false
        ) => {
            const cleanPath = (Array.isArray(path) ? path : []).filter(isPoint).map(cleanPoint);
            if (cleanPath.length < 2) return;
            const alignmentTargets = [{
                origin: addScaled(referencePoint, normal, targetLaneIndex * laneSpacingPx),
                heading: normalizeHeadingDeg(
                    referenceHeadingDeg + (targetTravelSign < 0 ? 180 : 0)
                )
            }];
            if (Number.isFinite(sourceLaneIndex) && Number.isFinite(sourceTravelSign)) {
                alignmentTargets.push({
                    origin: addScaled(referencePoint, normal, sourceLaneIndex * laneSpacingPx),
                    heading: normalizeHeadingDeg(
                        referenceHeadingDeg + (sourceTravelSign < 0 ? 180 : 0)
                    )
                });
            }
            const edgeCoverageActive = (index) => {
                const from = cleanPath[index];
                const to = cleanPath[index + 1];
                if (distance(from, to) <= EPSILON || !workEnvelopePolygon) return false;
                const motionHeading = normalizeHeadingDeg(Math.atan2(
                    to.x - from.x,
                    -(to.y - from.y)
                ) * 180 / Math.PI);
                const headingRadians = motionHeading * Math.PI / 180;
                const vehicleForward = {
                    x: Math.sin(headingRadians),
                    y: -Math.cos(headingRadians)
                };
                const midpoint = {
                    x: (from.x + to.x) / 2,
                    y: (from.y + to.y) / 2
                };
                const workPoint = addScaled(midpoint, vehicleForward, -implementWorkOffset);
                const aligned = alignmentTargets.some(target => {
                    const headingError = Math.abs(
                        ((motionHeading - target.heading + 540) % 360) - 180
                    );
                    if (headingError > 12) return false;
                    const crossTrack = Math.abs(dot({
                        x: workPoint.x - target.origin.x,
                        y: workPoint.y - target.origin.y
                    }, normal));
                    return crossTrack <= Math.max(0.25, workingWidth * 0.1);
                });
                return (aligned || allowEnvelopeStaging)
                    && isPointInPolygon(workPoint, workEnvelopePolygon)
                    && !edgeOverlapsProtectedCoverage(from, to, motionHeading);
            };
            let runStart = 0;
            let runCoverageActive = edgeCoverageActive(0);
            for (let edgeIndex = 1; edgeIndex < cleanPath.length - 1; edgeIndex += 1) {
                const coverageActive = edgeCoverageActive(edgeIndex);
                if (coverageActive === runCoverageActive) continue;
                appendPath(cleanPath.slice(runStart, edgeIndex + 1), {
                    ...metadata,
                    coverageActive: runCoverageActive,
                    implementDown: runCoverageActive
                });
                runStart = edgeIndex;
                runCoverageActive = coverageActive;
            }
            appendPath(cleanPath.slice(runStart), {
                ...metadata,
                coverageActive: runCoverageActive,
                implementDown: runCoverageActive
            });
        };
        const pointAtT = (lane, t) => {
            const laneOrigin = addScaled(referencePoint, normal, lane.laneIndex * laneSpacingPx);
            return addScaled(laneOrigin, forward, t);
        };
        const strictLine = (start, end) => segmentStrictlyInsidePolygon(start, end, polygon, safetyMargin);
        const turnCutbackAllowance = smartTurnPattern === 'FISH_TAIL'
            ? minimumRadius * 1.5
            : minimumRadius * 3.25;
        const isNearNaturalHeadlandEnd = (lane, t, travelDirection, entering = false) => {
            const targetT = entering
                ? travelDirection > 0
                    ? lane.workEnvelopeMinT
                    : lane.workEnvelopeMaxT
                : travelDirection > 0
                    ? lane.workEnvelopeMaxT
                    : lane.workEnvelopeMinT;
            return Number.isFinite(targetT)
                && Math.abs(t - targetT) <= turnCutbackAllowance + EPSILON;
        };
        const findBasicConnector = (lane, nextLane, laneStartT, travelSign) => {
            const laneDelta = nextLane.laneIndex - lane.laneIndex;
            if (laneDelta === 0) return null;
            const lower = Math.max(lane.minT, nextLane.minT);
            const upper = Math.min(lane.maxT, nextLane.maxT);
            if (upper - lower <= EPSILON) return null;
            const availableLower = travelSign > 0 ? Math.max(lower, laneStartT + EPSILON) : lower;
            const availableUpper = travelSign < 0 ? Math.min(upper, laneStartT - EPSILON) : upper;
            if (availableUpper - availableLower <= EPSILON) return null;
            const span = availableUpper - availableLower;
            const attempts = Math.min(256, Math.max(16, Math.ceil(span / Math.max(1, minimumRadius / 8))));
            for (let attempt = 0; attempt <= attempts; attempt += 1) {
                const ratio = attempt / attempts;
                const candidateT = travelSign > 0
                    ? availableUpper - span * ratio
                    : availableLower + span * ratio;
                const nextTravelSign = -travelSign;
                if (!isNearNaturalHeadlandEnd(lane, candidateT, travelSign)
                    || !isNearNaturalHeadlandEnd(nextLane, candidateT, nextTravelSign, true)) continue;
                const turnStart = pointAtT(lane, candidateT);
                const turn = planBasicTurn({
                    position: turnStart,
                    headingDeg: normalizeHeadingDeg(referenceHeadingDeg + (travelSign < 0 ? 180 : 0)),
                    laneSpacingPx,
                    passDelta: Math.abs(laneDelta),
                    minRadiusPx: minimumRadius,
                    pattern: smartTurnPattern,
                    // `direction` is relative to the vehicle's right. Reversing the
                    // sweep heading also reverses that local right vector.
                    direction: Math.sign(laneDelta) * travelSign,
                    safetyMarginPx: safetyMargin,
                    boundaryPoints: polygon
                });
                if (!turn.feasible
                    || !strictPathInsidePolygon(turn.points, polygon, safetyMargin)
                    || !pathWithinBoundaryBand(turn.points, polygon, headlandBandDepth)) continue;
                const exit = turn.points[turn.points.length - 1];
                const expectedExit = pointAtT(nextLane, candidateT);
                if (distance(exit, expectedExit) > 0.5 || !strictLine(pointAtT(lane, laneStartT), turnStart)) continue;
                return { t: candidateT, turn };
            }
            return null;
        };
        const connectTransit = (start, end) => {
            if (strictLine(start, end)) return [start, end];
            const headlandRoute = routeViaHeadland(
                start, end, options.headlandPathPoints, polygon, safetyMargin
            );
            return headlandRoute || shortestSafeTransit(
                start, end, transitWaypoints, polygon, safetyMargin
            );
        };
        const suppliedHeadlandRings = requestedHeadlandRings.filter(ring => (
            isSimplePolygon(ring)
            && strictPathInsidePolygon([...ring, ring[0]], polygon, safetyMargin)
        ));
        const suppliedHeadlandRing = suppliedHeadlandRings[0] || [];
        const suppliedHeadlandDepth = suppliedHeadlandRings.reduce((ringMaximum, ring) => Math.max(
            ringMaximum,
            ring.reduce((maximum, point) => Math.max(
                maximum,
                distanceToPolygonEdge(point, polygon)
            ), 0)
        ), 0);
        const transitHeadlandDepth = Math.max(
            headlandBandDepth,
            suppliedHeadlandDepth + (suppliedHeadlandRing.length ? laneSpacingPx : 0)
        );
        const roundedHeadlandPaths = suppliedHeadlandRings.map(ring => (
            buildRoundedClosedPath(
                ring,
                minimumRadius,
                polygon,
                safetyMargin,
                transitHeadlandDepth
            )
        ));
        const roundedHeadlandPath = roundedHeadlandPaths[roundedHeadlandPaths.length - 1] || null;
        const connectHeadlandTransit = (start, end, startHeading, endHeading) => {
            const connector = planDubinsConnector({
                start,
                end,
                startHeadingDeg: startHeading,
                endHeadingDeg: endHeading,
                radius: minimumRadius,
                polygon,
                safetyMargin,
                maximumBoundaryDepth: transitHeadlandDepth
            });
            return connector?.points || null;
        };
        const findHeadlandCloseConnector = (lane, laneStartT, travelDirection) => {
            if (!roundedHeadlandPath?.length) return null;
            const circuit = roundedHeadlandPath.slice(0, -1);
            const lower = travelDirection > 0 ? Math.max(lane.minT, laneStartT + EPSILON) : lane.minT;
            const upper = travelDirection < 0 ? Math.min(lane.maxT, laneStartT - EPSILON) : lane.maxT;
            if (upper - lower <= EPSILON) return null;
            const span = upper - lower;
            const attempts = headlandAttemptCount(span, minimumRadius);
            const startHeading = normalizeHeadingDeg(
                referenceHeadingDeg + (travelDirection < 0 ? 180 : 0)
            );
            const targetPoses = buildHeadlandTargetPoses(circuit);
            for (let attempt = 0; attempt <= attempts; attempt += 1) {
                const ratio = attempt / attempts;
                const candidateT = travelDirection > 0
                    ? upper - span * ratio
                    : lower + span * ratio;
                const startPoint = pointAtT(lane, candidateT);
                if (!strictLine(pointAtT(lane, laneStartT), startPoint)) continue;
                const candidates = [];
                rankHeadlandTargetPoses(
                    targetPoses,
                    circuit.length,
                    startPoint,
                    startHeading,
                    minimumRadius
                ).forEach(pose => {
                    const points = connectHeadlandTransit(
                        startPoint,
                        pose.target,
                        startHeading,
                        pose.targetHeading
                    );
                    if (points) candidates.push({
                        t: candidateT,
                        points,
                        circuitIndex: pose.circuitIndex,
                        circuitDirection: pose.circuitDirection,
                        targetHeading: pose.targetHeading,
                        lengthPx: pathLength(points)
                    });
                });
                candidates.sort((a, b) => a.lengthPx - b.lengthPx);
                if (candidates.length) return candidates[0];
            }
            return null;
        };
        const buildHeadlandRecommendation = (entryConnector) => {
            if (!entryConnector
                || roundedHeadlandPaths.length !== suppliedHeadlandRings.length
                || roundedHeadlandPaths.some(path => !Array.isArray(path) || path.length < 4)) return null;
            const recommendationPoints = [];
            const recommendationSegments = [];
            const appendRecommendationPath = (path, metadata) => {
                const cleanPath = (Array.isArray(path) ? path : []).filter(isPoint).map(cleanPoint);
                if (cleanPath.length < 2) return;
                if (!recommendationPoints.length) recommendationPoints.push(cleanPath[0]);
                else if (distance(recommendationPoints[recommendationPoints.length - 1], cleanPath[0]) > EPSILON) {
                    recommendationPoints.push(cleanPath[0]);
                }
                const startIndex = recommendationPoints.length - 1;
                cleanPath.slice(1).forEach(point => {
                    if (distance(recommendationPoints[recommendationPoints.length - 1], point) > EPSILON) {
                        recommendationPoints.push(point);
                    }
                });
                recommendationSegments.push({
                    startIndex,
                    endIndex: recommendationPoints.length - 1,
                    coverageActive: metadata.coverageActive === undefined
                        ? metadata.phase === 'HEADLAND_CLOSE'
                        : Boolean(metadata.coverageActive),
                    implementDown: metadata.implementDown === undefined
                        ? metadata.phase === 'HEADLAND_CLOSE'
                        : Boolean(metadata.implementDown),
                    ...metadata
                });
            };
            const appendProtectedAwareRecommendationPath = (path, metadata) => {
                splitProtectedAwareCoveragePath(path, metadata).forEach(run => {
                    appendRecommendationPath(run.points, {
                        ...metadata,
                        headingDeg: run.headingDeg,
                        coverageActive: run.coverageActive,
                        implementDown: run.coverageActive
                    });
                });
            };
            const appendStagedHeadlandEntry = path => {
                const sourcePath = (Array.isArray(path) ? path : [])
                    .filter(isPoint)
                    .map(cleanPoint);
                if (sourcePath.length < 2) return;
                const cleanPath = [sourcePath[0]];
                for (let edgeIndex = 0; edgeIndex < sourcePath.length - 1; edgeIndex += 1) {
                    const from = sourcePath[edgeIndex];
                    const to = sourcePath[edgeIndex + 1];
                    const edgeHeading = Math.atan2(to.x - from.x, -(to.y - from.y));
                    const edgeForward = {
                        x: Math.sin(edgeHeading),
                        y: -Math.cos(edgeHeading)
                    };
                    const workPointAt = ratio => addScaled({
                        x: from.x + (to.x - from.x) * ratio,
                        y: from.y + (to.y - from.y) * ratio
                    }, edgeForward, -implementWorkOffset);
                    const startInside = Boolean(workEnvelopePolygon)
                        && isPointInPolygon(workPointAt(0), workEnvelopePolygon);
                    const endInside = Boolean(workEnvelopePolygon)
                        && isPointInPolygon(workPointAt(1), workEnvelopePolygon);
                    if (startInside !== endInside) {
                        let low = 0;
                        let high = 1;
                        for (let iteration = 0; iteration < 32; iteration += 1) {
                            const middle = (low + high) / 2;
                            if (isPointInPolygon(workPointAt(middle), workEnvelopePolygon) === startInside) {
                                low = middle;
                            } else high = middle;
                        }
                        const crossingRatio = (low + high) / 2;
                        cleanPath.push({
                            x: from.x + (to.x - from.x) * crossingRatio,
                            y: from.y + (to.y - from.y) * crossingRatio
                        });
                    }
                    if (distance(cleanPath[cleanPath.length - 1], to) > EPSILON) cleanPath.push(to);
                }
                const edgeCoverageActive = index => {
                    if (!workEnvelopePolygon) return false;
                    const from = cleanPath[index];
                    const to = cleanPath[index + 1];
                    if (distance(from, to) <= EPSILON) return false;
                    const pathHeading = Math.atan2(
                        to.x - from.x,
                        -(to.y - from.y)
                    );
                    const pathForward = {
                        x: Math.sin(pathHeading),
                        y: -Math.cos(pathHeading)
                    };
                    const midpoint = {
                        x: (from.x + to.x) / 2,
                        y: (from.y + to.y) / 2
                    };
                    const workPoint = addScaled(midpoint, pathForward, -implementWorkOffset);
                    return isPointInPolygon(workPoint, workEnvelopePolygon)
                        && !edgeOverlapsProtectedCoverage(
                            from,
                            to,
                            pathHeading * 180 / Math.PI
                        );
                };
                let runStart = 0;
                let runCoverageActive = edgeCoverageActive(0);
                for (let edgeIndex = 1; edgeIndex < cleanPath.length - 1; edgeIndex += 1) {
                    const coverageActive = edgeCoverageActive(edgeIndex);
                    if (coverageActive === runCoverageActive) continue;
                    appendRecommendationPath(cleanPath.slice(runStart, edgeIndex + 1), {
                        phase: 'TRANSIT',
                        transitRole: 'HEADLAND_ENTRY',
                        pathType: 'DUBINS',
                        minRadiusPx: minimumRadius,
                        coverageActive: runCoverageActive,
                        implementDown: runCoverageActive
                    });
                    runStart = edgeIndex;
                    runCoverageActive = coverageActive;
                }
                appendRecommendationPath(cleanPath.slice(runStart), {
                    phase: 'TRANSIT',
                    transitRole: 'HEADLAND_ENTRY',
                    pathType: 'DUBINS',
                    minRadiusPx: minimumRadius,
                    coverageActive: runCoverageActive,
                    implementDown: runCoverageActive
                });
            };
            appendStagedHeadlandEntry(entryConnector.points);

            let selectedEntry = entryConnector;
            let currentPoint = entryConnector.points[entryConnector.points.length - 1];
            let currentHeading = entryConnector.targetHeading;
            let completedPasses = 0;
            for (let reverseIndex = roundedHeadlandPaths.length - 1; reverseIndex >= 0; reverseIndex -= 1) {
                const circuit = roundedHeadlandPaths[reverseIndex].slice(0, -1);
                if (!circuit.length) return null;
                if (reverseIndex !== roundedHeadlandPaths.length - 1) {
                    const candidates = [];
                    const targetPoses = buildHeadlandTargetPoses(circuit);
                    rankHeadlandTargetPoses(
                        targetPoses,
                        circuit.length,
                        currentPoint,
                        currentHeading,
                        minimumRadius
                    ).forEach(pose => {
                        const points = connectHeadlandTransit(
                            currentPoint,
                            pose.target,
                            currentHeading,
                            pose.targetHeading
                        );
                        if (points) candidates.push({
                            points,
                            circuitIndex: pose.circuitIndex,
                            circuitDirection: pose.circuitDirection,
                            targetHeading: pose.targetHeading,
                            lengthPx: pathLength(points)
                        });
                    });
                    candidates.sort((a, b) => a.lengthPx - b.lengthPx);
                    selectedEntry = candidates[0] || null;
                    if (!selectedEntry) return null;
                    appendRecommendationPath(selectedEntry.points, {
                        phase: 'TRANSIT',
                        transitRole: 'HEADLAND_RING_CHANGE',
                        pathType: 'DUBINS',
                        minRadiusPx: minimumRadius,
                        fromHeadlandPassIndex: completedPasses - 1,
                        toHeadlandPassIndex: completedPasses
                    });
                    currentPoint = selectedEntry.points[selectedEntry.points.length - 1];
                    currentHeading = selectedEntry.targetHeading;
                }

                const rotatedRing = [];
                for (let index = 0; index < circuit.length; index += 1) {
                    rotatedRing.push(circuit[
                        (selectedEntry.circuitIndex
                            + selectedEntry.circuitDirection * index
                            + circuit.length * 2) % circuit.length
                    ]);
                }
                appendProtectedAwareRecommendationPath(
                    [...rotatedRing, rotatedRing[0]], {
                        phase: 'HEADLAND_CLOSE',
                        laneIndex: null,
                        headlandPassIndex: completedPasses,
                        sourceRingIndex: reverseIndex
                    }
                );
                currentPoint = rotatedRing[0];
                currentHeading = selectedEntry.targetHeading;
                completedPasses += 1;
            }
            return {
                points: recommendationPoints,
                segments: recommendationSegments,
                estimatedDistancePx: pathLength(recommendationPoints),
                passCount: completedPasses
            };
        };
        const findHeadlandLaneConnector = (lane, nextLane, laneStartT, travelDirection) => {
            const lower = travelDirection > 0 ? Math.max(lane.minT, laneStartT + EPSILON) : lane.minT;
            const upper = travelDirection < 0 ? Math.min(lane.maxT, laneStartT - EPSILON) : lane.maxT;
            if (upper - lower <= EPSILON) return null;
            const span = upper - lower;
            const attempts = Math.min(256, Math.max(16, Math.ceil(span / Math.max(1, minimumRadius / 8))));
            const targetSign = -travelDirection;
            const targetT = targetSign > 0 ? nextLane.minT : nextLane.maxT;
            const targetPoint = pointAtT(nextLane, targetT);
            const startHeading = normalizeHeadingDeg(
                referenceHeadingDeg + (travelDirection < 0 ? 180 : 0)
            );
            const targetHeading = normalizeHeadingDeg(
                referenceHeadingDeg + (targetSign < 0 ? 180 : 0)
            );
            for (let attempt = 0; attempt <= attempts; attempt += 1) {
                const ratio = attempt / attempts;
                const candidateT = travelDirection > 0
                    ? upper - span * ratio
                    : lower + span * ratio;
                if (!isNearNaturalHeadlandEnd(lane, candidateT, travelDirection)) continue;
                const startPoint = pointAtT(lane, candidateT);
                if (!strictLine(pointAtT(lane, laneStartT), startPoint)) continue;
                const points = connectHeadlandTransit(
                    startPoint,
                    targetPoint,
                    startHeading,
                    targetHeading
                );
                if (points) return {
                    t: candidateT,
                    points,
                    targetT,
                    targetSign,
                    lengthPx: pathLength(points)
                };
            }
            return null;
        };

        const headingRadians = headingDeg * Math.PI / 180;
        const vehicleForward = { x: Math.sin(headingRadians), y: -Math.cos(headingRadians) };
        let travelSign = dot(vehicleForward, forward) >= 0 ? 1 : -1;
        const entrySourceTravelSign = travelSign;
        let laneStartT;
        let currentPoint = position;
        const firstLane = orderedLanes[0];
        const firstOrigin = addScaled(referencePoint, normal, firstLane.laneIndex * laneSpacingPx);
        const firstOffset = {
            x: position.x - firstOrigin.x,
            y: position.y - firstOrigin.y
        };
        const rawProjectedT = dot(firstOffset, forward);
        const rawCrossTrack = Math.abs(dot(firstOffset, normal));
        const activeEntryTolerance = Math.max(0.25, laneSpacingPx * 0.05);
        const vehicleAtUnworkedEntry = travelSign > 0
            ? rawProjectedT <= firstLane.minT + activeEntryTolerance
            : rawProjectedT >= firstLane.maxT - activeEntryTolerance;
        const firstLaneIsActive = firstLane.laneIndex === currentLaneIndex
            && !completedLaneIndices.has(currentLaneIndex)
            && rawCrossTrack <= laneSpacingPx * 0.75 + EPSILON
            && vehicleAtUnworkedEntry
            && rawProjectedT >= firstLane.minT - EPSILON
            && rawProjectedT <= firstLane.maxT + EPSILON;
        let firstEntryT;
        let firstEntryPoint;
        let entryTransit;
        let entryExitTransit;
        let entryHeadlandTransit;
        let entryTurnTransit;

        if (firstLaneIsActive) {
            // The active pass may begin at the leading edge of an unworked
            // residual produced by workedLaneIntervals. Without that coverage
            // proof, the whole current fragment was deferred above instead.
            firstEntryT = clamp(rawProjectedT, firstLane.minT, firstLane.maxT);
            firstEntryPoint = pointAtT(firstLane, firstEntryT);
            entryTransit = distance(position, firstEntryPoint) > EPSILON
                ? connectTransit(position, firstEntryPoint)
                : [position];
        } else {
            // A different (often skipped/completed) current lane must not cause
            // an unworked target pass to start at the vehicle's mid-field
            // projection. Reach a headland, then enter one end of the target so
            // the complete pass is represented in the generated route.
            const currentOrigin = addScaled(referencePoint, normal, currentLaneIndex * laneSpacingPx);
            const currentOffset = {
                x: position.x - currentOrigin.x,
                y: position.y - currentOrigin.y
            };
            const currentT = dot(currentOffset, forward);
            const currentCrossTrack = Math.abs(dot(currentOffset, normal));
            const residualCurrentFragment = currentCrossTrack <= laneSpacingPx * 0.75 + EPSILON
                ? lanes.filter(lane => lane.laneIndex === currentLaneIndex
                    && currentT >= lane.minT - EPSILON
                    && currentT <= lane.maxT + EPSILON)
                    .sort((a, b) => b.lengthPx - a.lengthPx)[0] || null
                : null;
            const physicalCurrentFragment = currentCrossTrack <= laneSpacingPx * 0.75 + EPSILON
                ? workEnvelopeLaneFragments.filter(lane => lane.laneIndex === currentLaneIndex
                    && currentT >= lane.minT - EPSILON
                    && currentT <= lane.maxT + EPSILON)
                    .sort((a, b) => b.lengthPx - a.lengthPx)[0] || null
                : null;
            const currentFragment = residualCurrentFragment || physicalCurrentFragment;
            let transitOrigin = position;
            let transitPrefix = [position];
            if (currentFragment) {
                const currentExitT = travelSign > 0 ? currentFragment.maxT : currentFragment.minT;
                const currentExit = pointAtT(currentFragment, currentExitT);
                if (strictLine(position, currentExit)) {
                    transitOrigin = currentExit;
                    transitPrefix = distance(position, currentExit) > EPSILON
                        ? [position, currentExit]
                        : [position];
                }
            }

            const basicEntry = currentFragment
                ? findBasicConnector(currentFragment, firstLane, currentT, travelSign)
                : null;
            if (basicEntry && strictLine(position, basicEntry.turn.points[0])) {
                firstEntryT = basicEntry.t;
                firstEntryPoint = basicEntry.turn.points[basicEntry.turn.points.length - 1];
                entryExitTransit = distance(position, basicEntry.turn.points[0]) > EPSILON
                    ? [position, basicEntry.turn.points[0]]
                    : [position];
                entryTurnTransit = basicEntry.turn;
                travelSign *= -1;
            } else {
                const entryCandidates = [
                    { t: firstLane.minT, sign: 1 },
                    { t: firstLane.maxT, sign: -1 }
                ].map(candidate => {
                    const point = pointAtT(firstLane, candidate.t);
                    const suffix = connectHeadlandTransit(
                        transitOrigin,
                        point,
                        normalizeHeadingDeg(referenceHeadingDeg + (travelSign < 0 ? 180 : 0)),
                        normalizeHeadingDeg(referenceHeadingDeg + (candidate.sign < 0 ? 180 : 0))
                    );
                    if (!suffix) return null;
                    return {
                        ...candidate,
                        point,
                        exitPath: transitPrefix,
                        headlandPath: suffix,
                        lengthPx: pathLength(transitPrefix) + pathLength(suffix)
                    };
                }).filter(Boolean).sort((a, b) => a.lengthPx - b.lengthPx);
                const selectedEntry = entryCandidates[0] || null;
                if (selectedEntry) {
                    firstEntryT = selectedEntry.t;
                    firstEntryPoint = selectedEntry.point;
                    travelSign = selectedEntry.sign;
                    entryExitTransit = selectedEntry.exitPath;
                    entryHeadlandTransit = selectedEntry.headlandPath;
                }
            }
        }

        if ((!entryTransit && !entryHeadlandTransit && !entryTurnTransit)
            || !firstEntryPoint || !Number.isFinite(firstEntryT)) return {
                ...invalidResult('NO_SAFE_ENTRY', [position]),
                lanes,
                remainingPassCount: orderedLanes.length,
                skippedWorkedLaneIndices,
                targetLaneIndex: firstLane.laneIndex,
                targetHeading: normalizeHeadingDeg(referenceHeadingDeg + (travelSign < 0 ? 180 : 0))
            };
        if (entryExitTransit?.length > 1) {
            appendPath(entryExitTransit, {
                phase: 'TRANSIT',
                transitRole: 'CURRENT_LANE_EXIT',
                fromLaneIndex: currentLaneIndex,
                toLaneIndex: currentLaneIndex
            });
        }
        if (entryHeadlandTransit?.length > 1) {
            appendStagedLaneEntry(entryHeadlandTransit, {
                phase: 'TRANSIT',
                transitRole: 'HEADLAND',
                fromLaneIndex: currentLaneIndex,
                toLaneIndex: firstLane.laneIndex
            }, firstLane.laneIndex, travelSign, currentLaneIndex, entrySourceTravelSign);
        } else if (entryTurnTransit?.points?.length > 1) {
            appendTurnPath(entryTurnTransit, {
                phase: 'TURN',
                fromLaneIndex: currentLaneIndex,
                toLaneIndex: firstLane.laneIndex,
                shape: entryTurnTransit.shape,
                targetLaneDelta: entryTurnTransit.targetLaneDelta
            });
        } else if (entryTransit?.length > 1) {
            appendPath(entryTransit, {
                phase: 'TRANSIT',
                transitRole: 'ACTIVE_LANE_ENTRY',
                fromLaneIndex: currentLaneIndex,
                toLaneIndex: firstLane.laneIndex
            });
        } else if (routePoints.length === 0) routePoints.push(position);
        currentPoint = firstEntryPoint;
        laneStartT = firstEntryT;
        const initialTargetHeading = normalizeHeadingDeg(
            referenceHeadingDeg + (travelSign < 0 ? 180 : 0)
        );

        let failReason = null;
        let pendingHeadlandClose = null;
        for (let order = 0; order < orderedLanes.length; order += 1) {
            const lane = orderedLanes[order];
            let nextLane = orderedLanes[order + 1] || null;
            if (order > 0 && (laneStartT < lane.minT - EPSILON || laneStartT > lane.maxT + EPSILON)) {
                failReason = 'INVALID_LANE_ENTRY';
                break;
            }
            let connector = nextLane ? findBasicConnector(lane, nextLane, laneStartT, travelSign) : null;
            let headlandLaneConnector = nextLane && !connector
                ? findHeadlandLaneConnector(lane, nextLane, laneStartT, travelSign)
                : null;
            if (nextLane && !connector && !headlandLaneConnector) {
                for (let alternativeIndex = order + 2; alternativeIndex < orderedLanes.length; alternativeIndex += 1) {
                    const alternative = orderedLanes[alternativeIndex];
                    if (alternative.laneIndex !== nextLane.laneIndex) continue;
                    const alternativeBasic = findBasicConnector(
                        lane,
                        alternative,
                        laneStartT,
                        travelSign
                    );
                    const alternativeHeadland = alternativeBasic
                        ? null
                        : findHeadlandLaneConnector(lane, alternative, laneStartT, travelSign);
                    if (!alternativeBasic && !alternativeHeadland) continue;
                    orderedLanes[alternativeIndex] = nextLane;
                    orderedLanes[order + 1] = alternative;
                    nextLane.routeOrder = alternativeIndex;
                    alternative.routeOrder = order + 1;
                    nextLane = alternative;
                    connector = alternativeBasic;
                    headlandLaneConnector = alternativeHeadland;
                    break;
                }
            }
            const closingConnector = !nextLane && suppliedHeadlandRing.length
                ? findHeadlandCloseConnector(lane, laneStartT, travelSign)
                : null;
            const workEndT = connector
                ? connector.t
                : headlandLaneConnector
                    ? headlandLaneConnector.t
                : closingConnector
                    ? closingConnector.t
                : (travelSign > 0 ? lane.maxT : lane.minT);
            const workEnd = pointAtT(lane, workEndT);
            if (!strictLine(currentPoint, workEnd)) {
                failReason = 'UNSAFE_WORK_SEGMENT';
                break;
            }
            // A work edge is a vehicle path while coverage history describes
            // the offset toolbar. Split at the exact physical overlap border:
            // the vehicle may traverse a protected prefix, but the implement
            // stays raised until its complete bar clears prior work.
            appendProtectedAwarePath([currentPoint, workEnd], {
                phase: 'WORK',
                laneIndex: lane.laneIndex,
                laneFragmentIndex: lane.fragmentIndex,
                routeOrder: order,
                headingDeg: normalizeHeadingDeg(referenceHeadingDeg + (travelSign < 0 ? 180 : 0))
            });
            currentPoint = workEnd;
            if (!nextLane) {
                if (suppliedHeadlandRing.length && !closingConnector && autoCloseHeadland) {
                    failReason = 'NO_SAFE_HEADLAND_ENTRY';
                    break;
                }
                if (closingConnector) {
                    pendingHeadlandClose = closingConnector;
                }
                continue;
            }

            if (connector) {
                appendTurnPath(connector.turn, {
                    phase: 'TURN',
                    fromLaneIndex: lane.laneIndex,
                    toLaneIndex: nextLane.laneIndex,
                    shape: connector.turn.shape,
                    targetLaneDelta: connector.turn.targetLaneDelta
                });
                currentPoint = connector.turn.points[connector.turn.points.length - 1];
                laneStartT = connector.t;
                travelSign *= -1;
                continue;
            }

            if (headlandLaneConnector) {
                appendStagedLaneEntry(headlandLaneConnector.points, {
                    phase: 'TRANSIT',
                    transitRole: 'HEADLAND',
                    fromLaneIndex: lane.laneIndex,
                    toLaneIndex: nextLane.laneIndex,
                    pathType: 'DUBINS',
                    minRadiusPx: minimumRadius
                }, nextLane.laneIndex, headlandLaneConnector.targetSign, lane.laneIndex, travelSign, true);
                currentPoint = headlandLaneConnector.points[headlandLaneConnector.points.length - 1];
                laneStartT = headlandLaneConnector.targetT;
                travelSign = headlandLaneConnector.targetSign;
                continue;
            }

            const nextSign = -travelSign;
            const preferredNextT = nextSign > 0 ? nextLane.minT : nextLane.maxT;
            const nextStart = pointAtT(nextLane, preferredNextT);
            const transit = connectHeadlandTransit(
                currentPoint,
                nextStart,
                normalizeHeadingDeg(referenceHeadingDeg + (travelSign < 0 ? 180 : 0)),
                normalizeHeadingDeg(referenceHeadingDeg + (nextSign < 0 ? 180 : 0))
            );
            if (!transit) {
                failReason = 'NO_SAFE_TRANSIT';
                break;
            }
            appendStagedLaneEntry(transit, {
                phase: 'TRANSIT',
                transitRole: 'HEADLAND',
                fromLaneIndex: lane.laneIndex,
                toLaneIndex: nextLane.laneIndex
            }, nextLane.laneIndex, nextSign, lane.laneIndex, travelSign, true);
            currentPoint = nextStart;
            laneStartT = preferredNextT;
            travelSign = nextSign;
        }

        let headlandRecommendation = null;
        let headlandRecommendationFailReason = null;
        if (!failReason && requestedHeadlandRings.length > 0) {
            if (requestedHeadlandRings.length !== suppliedHeadlandRings.length
                || roundedHeadlandPaths.some(path => !path)) {
                headlandRecommendationFailReason = 'UNSAFE_HEADLAND_PATH';
            } else if (!pendingHeadlandClose) {
                headlandRecommendationFailReason = 'NO_SAFE_HEADLAND_ENTRY';
            } else {
                headlandRecommendation = buildHeadlandRecommendation(pendingHeadlandClose);
                if (!headlandRecommendation) {
                    headlandRecommendationFailReason = 'NO_SAFE_HEADLAND_RING_CONNECTOR';
                }
            }
            if (autoCloseHeadland && !headlandRecommendation) {
                failReason = headlandRecommendationFailReason;
            } else if (autoCloseHeadland && headlandRecommendation) {
                headlandRecommendation.segments.forEach(segment => {
                    const { startIndex, endIndex, ...metadata } = segment;
                    appendPath(
                        headlandRecommendation.points.slice(startIndex, endIndex + 1),
                        metadata
                    );
                });
                currentPoint = routePoints[routePoints.length - 1];
            }
        }

        const buildCoverageAudit = () => {
            const sweepTriangles = [];
            const addCoverageSweeps = (points, sourceSegments) => {
                (Array.isArray(sourceSegments) ? sourceSegments : [])
                    .filter(segment => segment.coverageActive === true)
                    .forEach(segment => {
                        const startIndex = clamp(
                            Math.round(finiteNumber(segment.startIndex)),
                            0,
                            Math.max(0, points.length - 1)
                        );
                        const endIndex = clamp(
                            Math.round(finiteNumber(segment.endIndex)),
                            startIndex,
                            Math.max(0, points.length - 1)
                        );
                        const toolBarAt = (index) => {
                            const point = points[index];
                            const before = points[Math.max(startIndex, index - 1)] || point;
                            const after = points[Math.min(endIndex, index + 1)] || point;
                            const pathHeading = Number.isFinite(Number(segment.headingDeg))
                                ? normalizeHeadingDeg(Number(segment.headingDeg))
                                : normalizeHeadingDeg(Math.atan2(
                                    after.x - before.x,
                                    -(after.y - before.y)
                                ) * 180 / Math.PI);
                            const headingRadians = pathHeading * Math.PI / 180;
                            const pathForward = {
                                x: Math.sin(headingRadians),
                                y: -Math.cos(headingRadians)
                            };
                            const pathRight = {
                                x: Math.cos(headingRadians),
                                y: Math.sin(headingRadians)
                            };
                            const center = addScaled(point, pathForward, -implementWorkOffset);
                            return {
                                left: addScaled(center, pathRight, -workingWidth / 2),
                                right: addScaled(center, pathRight, workingWidth / 2)
                            };
                        };
                        for (let index = startIndex; index < endIndex; index += 1) {
                            if (!isPoint(points[index]) || !isPoint(points[index + 1])) continue;
                            const first = toolBarAt(index);
                            const second = toolBarAt(index + 1);
                            const triangles = [
                                [first.left, second.left, second.right],
                                [first.left, second.right, first.right]
                            ];
                            triangles.forEach(triangle => {
                                if (Math.abs(polygonSignedArea(triangle)) > EPSILON) {
                                    sweepTriangles.push(triangle);
                                }
                            });
                        }
                    });
            };

            // Interior WORK is always part of the automated route. The same
            // recommended headland circuits are included in this physical
            // coverage oracle for both Manual and Auto closing modes.
            addCoverageSweeps(routePoints, segments.filter(segment => segment.coverageActive));
            if (headlandRecommendation) {
                addCoverageSweeps(
                    headlandRecommendation.points,
                    headlandRecommendation.segments.filter(segment => segment.coverageActive)
                );
            }

            const mergeCoverageIntervals = intervals => intervals
                .filter(interval => interval.maxT - interval.minT > EPSILON)
                .sort((a, b) => a.minT - b.minT)
                .reduce((merged, interval) => {
                    const previous = merged[merged.length - 1];
                    if (previous && interval.minT <= previous.maxT + 0.05) {
                        previous.maxT = Math.max(previous.maxT, interval.maxT);
                    } else merged.push({ ...interval });
                    return merged;
                }, []);
            const laneCoverage = lanes.filter(lane => !lane.completed).map(lane => {
                const intervals = [];
                sweepTriangles.forEach(triangle => {
                    linePolygonIntervals(
                        referencePoint,
                        forward,
                        normal,
                        lane.laneIndex * laneSpacingPx,
                        triangle
                    ).forEach(interval => {
                        const minT = Math.max(lane.minT, interval.minT);
                        const maxT = Math.min(lane.maxT, interval.maxT);
                        if (maxT - minT > EPSILON) intervals.push({ minT, maxT });
                    });
                });
                const coverageAuditTolerancePx = 0.05;
                const merged = mergeCoverageIntervals(intervals).map(interval => ({
                    minT: interval.minT - lane.minT <= coverageAuditTolerancePx
                        ? lane.minT
                        : interval.minT,
                    maxT: lane.maxT - interval.maxT <= coverageAuditTolerancePx
                        ? lane.maxT
                        : interval.maxT
                }));
                const coveredLengthPx = merged.reduce(
                    (sum, interval) => sum + interval.maxT - interval.minT,
                    0
                );
                const uncoveredIntervals = [];
                let cursor = lane.minT;
                merged.forEach(interval => {
                    if (interval.minT - cursor > EPSILON) {
                        uncoveredIntervals.push([cursor, interval.minT]);
                    }
                    cursor = Math.max(cursor, interval.maxT);
                });
                if (lane.maxT - cursor > EPSILON) uncoveredIntervals.push([cursor, lane.maxT]);
                return {
                    laneIndex: lane.laneIndex,
                    laneFragmentIndex: lane.fragmentIndex,
                    viable: Boolean(lane.viable),
                    expectedLengthPx: lane.lengthPx,
                    coveredLengthPx,
                    coverageRatio: lane.lengthPx > EPSILON
                        ? clamp(coveredLengthPx / lane.lengthPx, 0, 1)
                        : 1,
                    uncoveredIntervals
                };
            });
            const automatedLaneCoverage = laneCoverage.filter(lane => lane.viable);
            const manualLaneCoverage = laneCoverage.filter(lane => !lane.viable);
            const minimumCoverageRatio = automatedLaneCoverage.length
                ? Math.min(...automatedLaneCoverage.map(lane => lane.coverageRatio))
                : 1;
            const minimumAllCoverageRatio = laneCoverage.length
                ? Math.min(...laneCoverage.map(lane => lane.coverageRatio))
                : 1;
            return {
                complete: minimumCoverageRatio + EPSILON >= requiredCoverageRatio,
                fieldComplete: minimumAllCoverageRatio + EPSILON >= requiredCoverageRatio,
                requiredCoverageRatio,
                minimumCoverageRatio,
                minimumAllCoverageRatio,
                manualLaneCoverage,
                laneCoverage
            };
        };
        const coverageAudit = buildCoverageAudit();
        if (!failReason && options.requireFullCoverage && autoCloseHeadland && !coverageAudit.complete) {
            failReason = 'INCOMPLETE_FIELD_COVERAGE';
        }

        if (!failReason && !strictPathInsidePolygon(routePoints, polygon, safetyMargin)) {
            failReason = 'UNSAFE_ROUTE';
        }
        const turnCount = new Set(segments
            .filter(segment => segment.phase === 'TURN')
            .map(segment => Number.isFinite(segment.turnSequenceId)
                ? segment.turnSequenceId
                : `${segment.fromLaneIndex}:${segment.toLaneIndex}:${segment.startIndex}`)).size;
        const estimatedDistancePx = pathLength(routePoints);
        return {
            feasible: !failReason,
            failReason,
            points: routePoints,
            segments,
            lanes,
            turnCount,
            remainingPassCount: orderedLanes.length,
            skippedWorkedLaneIndices,
            targetLaneIndex: firstLane.laneIndex,
            targetHeading: initialTargetHeading,
            estimatedDistancePx,
            manualHeadlandRecommendation: autoCloseHeadland ? null : headlandRecommendation,
            automatedHeadlandPlan: autoCloseHeadland ? headlandRecommendation : null,
            headlandRecommendationFailReason,
            headlandPassCount: headlandRecommendation?.passCount || 0,
            autoCloseHeadland,
            coverageAudit
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
        planSmartFieldRoute,
        nearestPathProgress,
        lookaheadPoint,
        isPointInPolygon,
        isSimplePolygon,
        distanceToPolygonEdge,
        pathInsidePolygon
    });
}(typeof window !== 'undefined' ? window : globalThis));
