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
const getOffsetPolyline = (points, offset) => {
    if (offset === 0) return points.map(p => `${p.x},${p.y}`).join(' ');
    if (points.length < 2) return "";

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

    return newPoints.map(p => `${p.x},${p.y}`).join(' ');
};
