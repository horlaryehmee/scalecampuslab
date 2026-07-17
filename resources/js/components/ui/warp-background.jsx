import React, { useCallback, useMemo } from 'react';
import { motion } from 'motion/react';

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

function Beam({ width, x, delay, duration }) {
    const hue = useMemo(() => Math.floor(Math.random() * 360), []);
    const aspectRatio = useMemo(() => Math.floor(Math.random() * 10) + 1, []);

    return (
        <motion.div
            style={{
                '--x': `${x}`,
                '--width': `${width}`,
                '--aspect-ratio': `${aspectRatio}`,
                '--background': `linear-gradient(hsl(${hue} 80% 60%), transparent)`,
            }}
            className="absolute left-[var(--x)] top-0 aspect-[1/var(--aspect-ratio)] w-[var(--width)] bg-[var(--background)]"
            initial={{ y: '100cqmax', x: '-50%' }}
            animate={{ y: '-100%', x: '-50%' }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'linear',
            }}
        />
    );
}

function WarpBackground({
    children,
    perspective = 100,
    className,
    beamsPerSide = 3,
    beamSize = 5,
    beamDelayMax = 3,
    beamDelayMin = 0,
    beamDuration = 3,
    gridColor = 'rgba(15, 23, 42, 0.14)',
    ...props
}) {
    const generateBeams = useCallback(() => {
        const beams = [];
        const cellsPerSide = Math.floor(100 / beamSize);
        const step = cellsPerSide / beamsPerSide;

        for (let i = 0; i < beamsPerSide; i += 1) {
            const x = Math.floor(i * step);
            const delay = Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin;
            beams.push({ x, delay });
        }

        return beams;
    }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin]);

    const topBeams = useMemo(() => generateBeams(), [generateBeams]);
    const rightBeams = useMemo(() => generateBeams(), [generateBeams]);
    const bottomBeams = useMemo(() => generateBeams(), [generateBeams]);
    const leftBeams = useMemo(() => generateBeams(), [generateBeams]);
    const gridBackground = `linear-gradient(${gridColor} 0 1px, transparent 1px var(--beam-size)) 50% -0.5px / var(--beam-size) var(--beam-size), linear-gradient(90deg, ${gridColor} 0 1px, transparent 1px var(--beam-size)) 50% 50% / var(--beam-size) var(--beam-size)`;

    const renderBeams = (side, beams) => beams.map((beam, index) => (
        <Beam
            key={`${side}-${index}`}
            width={`${beamSize}%`}
            x={`${beam.x * beamSize}%`}
            delay={beam.delay}
            duration={beamDuration}
        />
    ));

    return (
        <div className={cn('relative overflow-hidden rounded-lg border border-slate-200 p-20', className)} {...props}>
            <div
                style={{
                    '--perspective': `${perspective}px`,
                    '--beam-size': `${beamSize}%`,
                }}
                className="pointer-events-none absolute left-0 top-0 size-full overflow-hidden [clip-path:inset(0)] [container-type:size] [perspective:var(--perspective)] [transform-style:preserve-3d]"
            >
                <div
                    className="absolute [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform-style:preserve-3d] [transform:rotateX(-90deg)] [width:100cqi]"
                    style={{ background: gridBackground }}
                >
                    {renderBeams('top', topBeams)}
                </div>
                <div
                    className="absolute top-full [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform-style:preserve-3d] [transform:rotateX(-90deg)] [width:100cqi]"
                    style={{ background: gridBackground }}
                >
                    {renderBeams('bottom', bottomBeams)}
                </div>
                <div
                    className="absolute left-0 top-0 [container-type:inline-size] [height:100cqmax] [transform-origin:0%_0%] [transform-style:preserve-3d] [transform:rotate(90deg)_rotateX(-90deg)] [width:100cqh]"
                    style={{ background: gridBackground }}
                >
                    {renderBeams('left', leftBeams)}
                </div>
                <div
                    className="absolute right-0 top-0 [container-type:inline-size] [height:100cqmax] [transform-origin:100%_0%] [transform-style:preserve-3d] [transform:rotate(-90deg)_rotateX(-90deg)] [width:100cqh]"
                    style={{ background: gridBackground }}
                >
                    {renderBeams('right', rightBeams)}
                </div>
            </div>
            <div className="relative">{children}</div>
        </div>
    );
}

export { WarpBackground };
