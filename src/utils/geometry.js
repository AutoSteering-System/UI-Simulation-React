// --- GEOMETRY HELPERS ---

const PIXELS_PER_METER = 15; 
const DEFAULT_IMPLEMENT_WIDTH = 3.0; // Default 3m

// Calculate total length of a path in pixels
const calculatePathLength = (points) => {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
        length += Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
    }
    return length;
};

// Check if segment (p1, p2) intersects with (p3, p4)
const getLineIntersection = (p1, p2, p3, p4) => {
    const s1_x = p2.x - p1.x;
    const s1_y = p2.y - p1.y;
    const s2_x = p4.x - p3.x;
    const s2_y = p4.y - p3.y;

    const denom = -s2_x * s1_y + s1_x * s2_y;
    if (Math.abs(denom) < 0.0001) return null; // Parallel lines

    const s = (-s1_y * (p1.x - p3.x) + s1_x * (p1.y - p3.y)) / denom;
    const t = ( s2_x * (p1.y - p3.y) - s2_y * (p1.x - p3.x)) / denom;

    // Strict intersection (0..1)
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        return {
            x: p1.x + (t * s1_x),
            y: p1.y + (t * s1_y)
        };
    }
    return null;
};

// Check for ANY self-intersection in the path
const checkSelfIntersection = (points) => {
    if (points.length < 4) return null;
    
    // Iterate backwards to find the most recent crossing
    for (let i = points.length - 2; i >= 2; i--) { 
        const p1 = points[i];
        const p2 = points[i+1];
        
        // Check against all previous segments
        for (let j = 0; j < i - 1; j++) {
            const p3 = points[j];
            const p4 = points[j+1];
            
            const intersection = getLineIntersection(p1, p2, p3, p4);
            if (intersection) {
                return {
                    earlySegmentIdx: j, // Start of the segment being crossed
                    lateSegmentIdx: i,  // Start of the segment doing the crossing
                    point: intersection
                };
            }
        }
    }
    return null;
};

// Normalize angle to -180 to 180
const normalizeAngle = (angle) => {
    let a = angle % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return a;
};

// Helper to calculate distance from point to line segment
const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) // in case of 0 length line
        param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    }
    else if (param > 1) {
        xx = x2;
        yy = y2;
    }
    else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    
    // Calculate cross product for signed distance (relative to segment direction)
    // Cross = C * dy_raw - D * dx_raw
    const cross = C * (py - y1) - D * (px - x1);
    
    return {
        distance: Math.sqrt(dx * dx + dy * dy),
        x: xx,
        y: yy,
        cross: cross
    };
}

// NEW: Advanced Curve Offset Algorithm (Vertex Normals)
// Ensures curves are parallel and smooth, not deformed
const getOffsetPolylinePoints = (points, offset) => {
    if (!Array.isArray(points)) return [];
    if (offset === 0) return points.map(point => ({ ...point }));
    if (points.length < 2) return [];

    const newPoints = [];
    
    // 1. Calculate normals for each segment
    const segmentNormals = [];
    for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i+1].x - points[i].x;
        const dy = points[i+1].y - points[i].y;
        const len = Math.hypot(dx, dy);
        if (len === 0) segmentNormals.push({ x: 0, y: 0 }); 
        else segmentNormals.push({ x: -dy / len, y: dx / len }); // Perpendicular vector (-y, x)
    }

    // 2. Offset Start Point (using first segment normal)
    newPoints.push({
        x: points[0].x + segmentNormals[0].x * offset,
        y: points[0].y + segmentNormals[0].y * offset
    });

    // 3. Offset Intermediate Points (using average "miter" normal of adjacent segments)
    for (let i = 1; i < points.length - 1; i++) {
        const n1 = segmentNormals[i-1];
        const n2 = segmentNormals[i];
        
        // Bisector vector
        let bx = n1.x + n2.x;
        let by = n1.y + n2.y;
        const blen = Math.hypot(bx, by);
        
        if (blen > 0.001) {
            // Normalize bisector
            bx /= blen;
            by /= blen;
            
            // Scale factor to keep constant width (1 / dot(n, b))
            // This prevents the line from getting thinner at sharp corners
            const dot = n1.x * bx + n1.y * by;
            const scale = (dot > 0.1) ? (1 / dot) : 1; 
            
            newPoints.push({
                x: points[i].x + bx * offset * scale,
                y: points[i].y + by * offset * scale
            });
        } else {
            // Parallel segments or 180 turn
            newPoints.push({
                x: points[i].x + n1.x * offset,
                y: points[i].y + n1.y * offset
            });
        }
    }

    // 4. Offset End Point (using last segment normal)
    const lastIdx = points.length - 1;
    const lastNormIdx = segmentNormals.length - 1;
    newPoints.push({
        x: points[lastIdx].x + segmentNormals[lastNormIdx].x * offset,
        y: points[lastIdx].y + segmentNormals[lastNormIdx].y * offset
    });

    return newPoints;
};

const getOffsetPolyline = (points, offset) => {
    return getOffsetPolylinePoints(points, offset)
        .map(point => `${point.x},${point.y}`)
        .join(' ');
};

// Signed screen-space polygon area. With the map's Y-down coordinate system,
// a visually clockwise exterior ring has a positive area.
const getPolygonSignedArea = (points) => {
    if (!Array.isArray(points) || points.length < 3) return 0;
    let twiceArea = 0;
    for (let index = 0; index < points.length; index += 1) {
        const current = points[index];
        const next = points[(index + 1) % points.length];
        twiceArea += current.x * next.y - next.x * current.y;
    }
    return twiceArea / 2;
};

const getInfiniteLineIntersection = (a1, a2, b1, b2) => {
    const ax = a2.x - a1.x;
    const ay = a2.y - a1.y;
    const bx = b2.x - b1.x;
    const by = b2.y - b1.y;
    const denominator = ax * by - ay * bx;
    if (Math.abs(denominator) < 1e-7) return null;
    const qx = b1.x - a1.x;
    const qy = b1.y - a1.y;
    const ratio = (qx * by - qy * bx) / denominator;
    return { x: a1.x + ax * ratio, y: a1.y + ay * ratio };
};

const polygonHasSelfIntersection = (points) => {
    if (!Array.isArray(points) || points.length < 4) return false;
    for (let first = 0; first < points.length; first += 1) {
        const firstNext = (first + 1) % points.length;
        for (let second = first + 1; second < points.length; second += 1) {
            const secondNext = (second + 1) % points.length;
            if (first === second || firstNext === second || secondNext === first) continue;
            if (first === 0 && secondNext === 0) continue;
            if (getLineIntersection(points[first], points[firstNext], points[second], points[secondNext])) return true;
        }
    }
    return false;
};

// Constant-distance buffer for a simple closed boundary. Positive values move
// outward and negative values move inward. Invalid/collapsed buffers return an
// empty array so callers can block Apply instead of saving broken geometry.
const getRawOffsetPolygonPoints = (points, outwardOffset) => {
    if (!Array.isArray(points)) return [];
    const clean = [];
    points.forEach((point) => {
        if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) return;
        const next = { x: Number(point.x), y: Number(point.y) };
        const previous = clean[clean.length - 1];
        if (!previous || Math.hypot(next.x - previous.x, next.y - previous.y) > 1e-5) clean.push(next);
    });
    if (clean.length > 2 && Math.hypot(clean[0].x - clean[clean.length - 1].x, clean[0].y - clean[clean.length - 1].y) <= 1e-5) clean.pop();
    if (clean.length < 3) return [];

    const sourceArea = getPolygonSignedArea(clean);
    const distance = Number(outwardOffset);
    if (!Number.isFinite(distance) || Math.abs(sourceArea) < 1e-5) return [];
    if (Math.abs(distance) < 1e-7) return clean.map(point => ({ ...point }));

    const outwardFactor = sourceArea > 0 ? -1 : 1;
    const offsetEdges = [];
    for (let index = 0; index < clean.length; index += 1) {
        const start = clean[index];
        const end = clean[(index + 1) % clean.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy);
        if (length < 1e-6) return [];
        const normal = {
            x: (-dy / length) * outwardFactor,
            y: (dx / length) * outwardFactor
        };
        offsetEdges.push({
            normal,
            start: { x: start.x + normal.x * distance, y: start.y + normal.y * distance },
            end: { x: end.x + normal.x * distance, y: end.y + normal.y * distance }
        });
    }

    const buffered = clean.map((vertex, index) => {
        const previous = offsetEdges[(index - 1 + offsetEdges.length) % offsetEdges.length];
        const next = offsetEdges[index];
        const intersection = getInfiniteLineIntersection(previous.start, previous.end, next.start, next.end);
        const maxMiter = Math.max(Math.abs(distance) * 8, Math.abs(distance) + 2);
        if (intersection && Math.hypot(intersection.x - vertex.x, intersection.y - vertex.y) <= maxMiter) return intersection;
        const normalX = previous.normal.x + next.normal.x;
        const normalY = previous.normal.y + next.normal.y;
        const normalLength = Math.hypot(normalX, normalY) || 1;
        return {
            x: vertex.x + normalX / normalLength * distance,
            y: vertex.y + normalY / normalLength * distance
        };
    });

    const bufferedArea = getPolygonSignedArea(buffered);
    if (Math.abs(bufferedArea) < 1e-5 || Math.sign(bufferedArea) !== Math.sign(sourceArea)) return [];
    for (let index = 0; index < clean.length; index += 1) {
        const sourceStart = clean[index];
        const sourceEnd = clean[(index + 1) % clean.length];
        const bufferedStart = buffered[index];
        const bufferedEnd = buffered[(index + 1) % buffered.length];
        const directionDot = (sourceEnd.x - sourceStart.x) * (bufferedEnd.x - bufferedStart.x)
            + (sourceEnd.y - sourceStart.y) * (bufferedEnd.y - bufferedStart.y);
        if (directionDot <= 1e-7) return [];
    }
    if (polygonHasSelfIntersection(buffered)) return [];
    return buffered;
};
function getSafeInsetPointToSegmentDistanceSquared(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) {
    const px = point.x - start.x;
    const py = point.y - start.y;
    return px * px + py * py;
  }

  const projection = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  const closestX = start.x + projection * dx;
  const closestY = start.y + projection * dy;
  const px = point.x - closestX;
  const py = point.y - closestY;
  return px * px + py * py;
}

function getSafeInsetCross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function isSafeInsetPointOnSegment(point, start, end) {
  const epsilon = 1e-7;
  return (
    Math.abs(getSafeInsetCross(start, end, point)) <= epsilon &&
    point.x >= Math.min(start.x, end.x) - epsilon &&
    point.x <= Math.max(start.x, end.x) + epsilon &&
    point.y >= Math.min(start.y, end.y) - epsilon &&
    point.y <= Math.max(start.y, end.y) + epsilon
  );
}

function doSafeInsetSegmentsIntersect(a, b, c, d) {
  const abC = getSafeInsetCross(a, b, c);
  const abD = getSafeInsetCross(a, b, d);
  const cdA = getSafeInsetCross(c, d, a);
  const cdB = getSafeInsetCross(c, d, b);
  const epsilon = 1e-7;

  if (
    ((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon)) &&
    ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon))
  ) {
    return true;
  }

  return (
    (Math.abs(abC) <= epsilon && isSafeInsetPointOnSegment(c, a, b)) ||
    (Math.abs(abD) <= epsilon && isSafeInsetPointOnSegment(d, a, b)) ||
    (Math.abs(cdA) <= epsilon && isSafeInsetPointOnSegment(a, c, d)) ||
    (Math.abs(cdB) <= epsilon && isSafeInsetPointOnSegment(b, c, d))
  );
}

function getSafeInsetSegmentDistance(a, b, c, d) {
  if (doSafeInsetSegmentsIntersect(a, b, c, d)) {
    return 0;
  }

  return Math.sqrt(
    Math.min(
      getSafeInsetPointToSegmentDistanceSquared(a, c, d),
      getSafeInsetPointToSegmentDistanceSquared(b, c, d),
      getSafeInsetPointToSegmentDistanceSquared(c, a, b),
      getSafeInsetPointToSegmentDistanceSquared(d, a, b),
    ),
  );
}

function isSafeInsetPointInsidePolygon(point, polygon) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const start = polygon[previous];
    const end = polygon[index];

    if (isSafeInsetPointOnSegment(point, start, end)) {
      return true;
    }

    const crossesRay =
      (start.y > point.y) !== (end.y > point.y) &&
      point.x <
        ((end.x - start.x) * (point.y - start.y)) / (end.y - start.y) + start.x;
    if (crossesRay) {
      inside = !inside;
    }
  }

  return inside;
}

function simplifySafeInsetSource(points, tolerance) {
  if (points.length <= 3 || tolerance <= 0) {
    return points.map((point) => ({ ...point }));
  }

  const toleranceSquared = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  const pending = [[0, points.length - 1]];
  keep[0] = 1;
  keep[points.length - 1] = 1;

  while (pending.length > 0) {
    const [startIndex, endIndex] = pending.pop();
    let furthestIndex = -1;
    let furthestDistanceSquared = toleranceSquared;

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distanceSquared = getSafeInsetPointToSegmentDistanceSquared(
        points[index],
        points[startIndex],
        points[endIndex],
      );
      if (distanceSquared > furthestDistanceSquared) {
        furthestDistanceSquared = distanceSquared;
        furthestIndex = index;
      }
    }

    if (furthestIndex >= 0) {
      keep[furthestIndex] = 1;
      pending.push([startIndex, furthestIndex], [furthestIndex, endIndex]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function isSafeInsetCandidate(candidate, source, clearance) {
  if (!Array.isArray(candidate) || candidate.length < 3 || source.length < 3) {
    return false;
  }

  for (const point of candidate) {
    if (!isSafeInsetPointInsidePolygon(point, source)) {
      return false;
    }
  }

  // Every planned edge must remain inside and clear of every segment of the
  // original, unsimplified boundary. The allowance is only for floating-point
  // rounding; the planner's physical safety margin remains intact.
  const numericAllowance = Math.max(1, Math.min(1.5, clearance * 0.01));
  const minimumClearance = Math.max(0, clearance - numericAllowance);

  for (let candidateIndex = 0; candidateIndex < candidate.length; candidateIndex += 1) {
    const candidateStart = candidate[candidateIndex];
    const candidateEnd = candidate[(candidateIndex + 1) % candidate.length];

    for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
      const sourceStart = source[sourceIndex];
      const sourceEnd = source[(sourceIndex + 1) % source.length];
      if (
        getSafeInsetSegmentDistance(
          candidateStart,
          candidateEnd,
          sourceStart,
          sourceEnd,
        ) < minimumClearance
      ) {
        return false;
      }
    }
  }

  return true;
}

function getConservativeInsetPolygon(points, clearance) {
  if (!Array.isArray(points) || points.length < 3 || clearance <= 0) {
    return [];
  }

  let twiceArea = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    twiceArea += point.x * next.y - next.x * point.y;
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  if (Math.abs(twiceArea) <= 1e-7) {
    return [];
  }

  const interiorSign = twiceArea > 0 ? 1 : -1;
  const margin = Math.max(maxX - minX, maxY - minY, clearance * 4, 1) * 2;
  let inset = [
    { x: minX - margin, y: minY - margin },
    { x: maxX + margin, y: minY - margin },
    { x: maxX + margin, y: maxY + margin },
    { x: minX - margin, y: maxY + margin },
  ];

  for (let edgeIndex = 0; edgeIndex < points.length; edgeIndex += 1) {
    const edgeStart = points[edgeIndex];
    const edgeEnd = points[(edgeIndex + 1) % points.length];
    const edgeLength = Math.hypot(
      edgeEnd.x - edgeStart.x,
      edgeEnd.y - edgeStart.y,
    );
    if (edgeLength <= 1e-7) {
      continue;
    }

    const signedClearance = (point) => (
      interiorSign * getSafeInsetCross(edgeStart, edgeEnd, point) / edgeLength - clearance
    );
    const input = inset;
    inset = [];
    if (input.length === 0) {
      return [];
    }

    let previous = input[input.length - 1];
    let previousDistance = signedClearance(previous);
    let previousInside = previousDistance >= -1e-7;

    input.forEach((current) => {
      const currentDistance = signedClearance(current);
      const currentInside = currentDistance >= -1e-7;

      if (currentInside !== previousInside) {
        const denominator = previousDistance - currentDistance;
        if (Math.abs(denominator) > 1e-12) {
          const ratio = Math.max(0, Math.min(1, previousDistance / denominator));
          inset.push({
            x: previous.x + (current.x - previous.x) * ratio,
            y: previous.y + (current.y - previous.y) * ratio,
          });
        }
      }
      if (currentInside) {
        inset.push({ x: current.x, y: current.y });
      }

      previous = current;
      previousDistance = currentDistance;
      previousInside = currentInside;
    });
  }

  const cleaned = inset.filter((point, index) => {
    if (index === 0) return true;
    const previous = inset[index - 1];
    return Math.hypot(point.x - previous.x, point.y - previous.y) > 1e-5;
  });
  if (
    cleaned.length > 3 &&
    Math.hypot(
      cleaned[0].x - cleaned[cleaned.length - 1].x,
      cleaned[0].y - cleaned[cleaned.length - 1].y,
    ) <= 1e-5
  ) {
    cleaned.pop();
  }

  return cleaned.length >= 3 ? cleaned : [];
}
/**
 * Creates an offset polygon while tolerating dense GPS samples and tiny local
 * kinks. The stored boundary is never changed: simplification is only used as
 * a planning input, and every result is checked against the original boundary.
 */
const getOffsetPolygonPoints = (points, outwardOffset) => {
  const direct = getRawOffsetPolygonPoints(points, outwardOffset);
  if (!Array.isArray(points) || points.length < 3 || outwardOffset >= 0) {
    return direct;
  }

  const source = points
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => ({ x: point.x, y: point.y }));

  if (
    source.length > 3 &&
    Math.hypot(
      source[0].x - source[source.length - 1].x,
      source[0].y - source[source.length - 1].y,
    ) <= 1e-6
  ) {
    source.pop();
  }

  const clearance = Math.abs(outwardOffset);
  if (
    Array.isArray(direct) &&
    direct.length >= 3 &&
    isSafeInsetCandidate(direct, source, clearance)
  ) {
    return direct;
  }

  // Intersect all inward edge half-planes before simplifying. For a convex or
  // nearly convex recorded field this naturally drops collapsed one-metre GPS
  // edges while retaining every original edge as a hard safety constraint.
  const conservativeInset = getConservativeInsetPolygon(source, clearance);
  if (isSafeInsetCandidate(conservativeInset, source, clearance)) {
    return conservativeInset;
  }

  // Progressively remove GPS sampling noise. Relative tolerances scale with
  // the requested inset, so normal boundaries remain untouched while short
  // edges that collapse during a deep headland inset can be skipped.
  const toleranceFactors = [
    0.005,
    0.01,
    0.02,
    0.035,
    0.05,
    0.075,
    0.1,
    0.125,
    0.15,
    0.175,
    0.2,
    0.225,
    0.25,
    0.275,
    0.3,
  ];
  const attemptedPointCounts = new Set();

  for (const factor of toleranceFactors) {
    const simplified = simplifySafeInsetSource(source, Math.max(0.5, clearance * factor));
    if (simplified.length < 3 || attemptedPointCounts.has(simplified.length)) {
      continue;
    }
    attemptedPointCounts.add(simplified.length);

    // A simplified chord can sit outside the recorded edge by at most its
    // tolerance. Increase the inset progressively and accept the shallowest
    // candidate that still clears the original boundary.
    const extraInsets = [0, tolerance * 0.25, tolerance * 0.5, tolerance * 0.75, tolerance];
    for (const extraInset of extraInsets) {
      const candidate = getRawOffsetPolygonPoints(
        simplified,
        outwardOffset - extraInset,
      );
      if (isSafeInsetCandidate(candidate, source, clearance)) {
        return candidate;
      }
    }
  }

  return [];
};
