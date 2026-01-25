const TractorVehicle = ({ mode, steeringAngle, implementWidth, vehicleSettings }) => {
  const ppm = PIXELS_PER_METER;
  
  // Dimensions (converted to pixels)
  const wheelbase = (vehicleSettings?.wheelbase || 2.5) * ppm;
  const frontOuterW = (vehicleSettings?.frontAxleWidth || 1.95) * ppm;
  const rearOuterW = (vehicleSettings?.rearAxleWidth || 2.65) * ppm;
  const rearHitch = (vehicleSettings?.rearHitch || 1.1) * ppm;
  
  // Positioning (Center of SVG is 50, 90 for 100x180)
  // Let's place the Rear Axle at Y=100 (slightly below center to leave room for implement)
  const rAxleY = 100;
  const fAxleY = rAxleY - wheelbase;
  
  // Tire Dimensions (Rear ~ 1.8m dia -> ~27px, Width ~0.6m -> ~9px)
  // Fine-tuned for better aesthetics
  const rTireDia = 32; 
  const rTireW = 12;   
  
  // Ratio 0.7 for balanced look (between 0.6 and 0.8)
  const ratio = 0.7; 
  const fTireDia = rTireDia * ratio; 
  const fTireW = rTireW * ratio;

  // Add visual padding to push implement back further
  const visualHitchPadding = 20; 
  const hitchY = rAxleY + rearHitch + visualHitchPadding;

  // Wheel Centers
  const rLeftX = 50 - (rearOuterW / 2) + (rTireW / 2);
  const rRightX = 50 + (rearOuterW / 2) - (rTireW / 2);
  
  const fLeftX = 50 - (frontOuterW / 2) + (fTireW / 2);
  const fRightX = 50 + (frontOuterW / 2) - (fTireW / 2);

  // Implement
  const implPx = implementWidth * ppm;
  const implX = 50 - implPx / 2;

  // Colors
  const bodyColor = mode === 'AUTO' ? '#22c55e' : '#3b82f6'; // Green/Blue
  const bodyStroke = mode === 'AUTO' ? '#15803d' : '#1d4ed8';
  const tireFill = '#1e293b';
  const rimFill = '#facc15'; // Yellow rims
  const cabinFill = 'rgba(255, 255, 255, 0.5)';
  
  return (
    <svg width="150" height="220" viewBox="0 0 100 220" className="drop-shadow-2xl filter overflow-visible">
        {/* === IMPLEMENT & HITCH === */}
        <g>
            {/* Drawbar / Linkage */}
            <path d={`M${50-4} ${rAxleY} L${50+4} ${rAxleY} L50 ${hitchY} Z`} fill="none" stroke="#475569" strokeWidth="2" strokeLinejoin="round"/>
            {/* Implement Bar */}
            <rect x={implX} y={hitchY} width={implPx} height="6" fill="#fbbf24" stroke="#b45309" strokeWidth="1" rx="1" />
            {/* Implement Tines/Details */}
            {Array.from({ length: 9 }).map((_, i) => (
                <line key={i} x1={implX + (implPx/8)*i} y1={hitchY+2} x2={implX + (implPx/8)*i} y2={hitchY+5} stroke="#78350f" strokeWidth="1" />
            ))}
        </g>

        {/* === TRACTOR CHASSIS UNDERLAYER === */}
        {/* Front Axle Beam */}
        <rect x={50 - frontOuterW/2} y={fAxleY - 2} width={frontOuterW} height="4" fill="#334155" rx="2" />
        {/* Rear Axle Housing */}
        <rect x={50 - rearOuterW/2 + 4} y={rAxleY - 3} width={rearOuterW - 8} height="6" fill="#334155" rx="2" />

        {/* === WHEELS === */}
        {/* Front Left */}
        <g transform={`rotate(${steeringAngle}, ${fLeftX}, ${fAxleY})`}>
            <rect x={fLeftX - fTireW/2} y={fAxleY - fTireDia/2} width={fTireW} height={fTireDia} fill={tireFill} rx="2" stroke="#0f172a" strokeWidth="1" />
            {/* Tread pattern */}
            <path d={`M${fLeftX - fTireW/2} ${fAxleY-5} L${fLeftX + fTireW/2} ${fAxleY} M${fLeftX - fTireW/2} ${fAxleY+5} L${fLeftX + fTireW/2} ${fAxleY+10}`} stroke="#475569" strokeWidth="1" opacity="0.3"/>
        </g>
        {/* Front Right */}
        <g transform={`rotate(${steeringAngle}, ${fRightX}, ${fAxleY})`}>
            <rect x={fRightX - fTireW/2} y={fAxleY - fTireDia/2} width={fTireW} height={fTireDia} fill={tireFill} rx="2" stroke="#0f172a" strokeWidth="1" />
            <path d={`M${fRightX - fTireW/2} ${fAxleY-5} L${fRightX + fTireW/2} ${fAxleY} M${fRightX - fTireW/2} ${fAxleY+5} L${fRightX + fTireW/2} ${fAxleY+10}`} stroke="#475569" strokeWidth="1" opacity="0.3"/>
        </g>
        
        {/* Rear Left */}
        <rect x={rLeftX - rTireW/2} y={rAxleY - rTireDia/2} width={rTireW} height={rTireDia} fill={tireFill} rx="3" stroke="#0f172a" strokeWidth="1" />
        <circle cx={rLeftX} cy={rAxleY} r="4" fill={rimFill} stroke="#ca8a04" strokeWidth="1"/>
        
        {/* Rear Right */}
        <rect x={rRightX - rTireW/2} y={rAxleY - rTireDia/2} width={rTireW} height={rTireDia} fill={tireFill} rx="3" stroke="#0f172a" strokeWidth="1" />
        <circle cx={rRightX} cy={rAxleY} r="4" fill={rimFill} stroke="#ca8a04" strokeWidth="1"/>

        {/* === BODY WORK === */}
        
        {/* Engine Hood - More compact */}
        <path d={`M${50 - frontOuterW*0.22} ${fAxleY - 5} 
                 L${50 + frontOuterW*0.22} ${fAxleY - 5} 
                 L${50 + rearOuterW*0.18} ${rAxleY - wheelbase*0.3} 
                 L${50 - rearOuterW*0.18} ${rAxleY - wheelbase*0.3} Z`} 
                 fill={bodyColor} stroke={bodyStroke} strokeWidth="1" />
        

        {/* Cabin Base / Fenders */}
        <path d={`M${50 - rearOuterW*0.38} ${rAxleY + 10} 
                 Q${50 - rearOuterW*0.42} ${rAxleY - rTireDia*0.7} ${50 - rearOuterW*0.25} ${rAxleY - wheelbase*0.45}
                 L${50 + rearOuterW*0.25} ${rAxleY - wheelbase*0.45}
                 Q${50 + rearOuterW*0.42} ${rAxleY - rTireDia*0.7} ${50 + rearOuterW*0.38} ${rAxleY + 10}
                 `} fill={bodyColor} stroke={bodyStroke} strokeWidth="1" />
    </svg>
  );
};
