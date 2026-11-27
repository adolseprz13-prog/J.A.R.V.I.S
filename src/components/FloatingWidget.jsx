import React, { useEffect, useRef, useState } from 'react';

export default function FloatingWidget() {
  const dragState = useRef({ dragging: false, moved: false, lastX: 0, lastY: 0, hovering: false });
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [happyBurst, setHappyBurst] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);

  // Follow desktop mouse cursor in real time
  useEffect(() => {
    const offCursor = window.jarvis?.onCursorMove?.(({ rx, ry }) => {
      setEyeOffset({ x: rx * 3.6, y: ry * 2.8 });
    });
    const offHud = window.jarvis?.onHudState?.((isOpen) => {
      setHudOpen(Boolean(isOpen));
    });
    return () => {
      offCursor?.();
      offHud?.();
    };
  }, []);

  // Natural blinking loop
  useEffect(() => {
    let timeoutId;
    const scheduleBlink = () => {
      const delay = 2600 + Math.random() * 3400;
      timeoutId = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          // Occasional double blink
          if (Math.random() < 0.25) {
            setTimeout(() => {
              setBlinking(true);
              setTimeout(() => setBlinking(false), 120);
            }, 140);
          }
          scheduleBlink();
        }, 135);
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  const handleMouseEnter = () => {
    dragState.current.hovering = true;
    setHovering(true);
    window.jarvis?.window?.setWidgetIgnoreMouse(false);
  };

  const handleMouseLeave = () => {
    dragState.current.hovering = false;
    setHovering(false);
    if (!dragState.current.dragging) {
      window.jarvis?.window?.setWidgetIgnoreMouse(true);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    window.jarvis?.window?.setWidgetIgnoreMouse(false);
    dragState.current = {
      ...dragState.current,
      dragging: true,
      moved: false,
      lastX: e.screenX,
      lastY: e.screenY,
    };

    const onMove = (ev) => {
      if (!dragState.current.dragging) return;
      const dx = ev.screenX - dragState.current.lastX;
      const dy = ev.screenY - dragState.current.lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragState.current.moved = true;
        setDragging(true);
      }
      if (dx !== 0 || dy !== 0) {
        dragState.current.lastX = ev.screenX;
        dragState.current.lastY = ev.screenY;
        window.jarvis?.window?.moveWidget(dx, dy);
      }
    };

    const onUp = () => {
      const wasMoved = dragState.current.moved;
      dragState.current.dragging = false;
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!dragState.current.hovering) {
        window.jarvis?.window?.setWidgetIgnoreMouse(true);
      }
      if (!wasMoved) {
        setHappyBurst(true);
        setTimeout(() => setHappyBurst(false), 520);
        window.jarvis?.window?.toggleHud();
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    window.jarvis?.window?.showWidgetMenu();
  };

  const tiltDeg = dragging ? -8 : hovering ? eyeOffset.x * 1.4 : eyeOffset.x * 0.7;

  return (
    <div className="widget-root">
      <div
        className={`coffee-mascot ${hovering ? 'is-hover' : ''} ${dragging ? 'is-drag' : ''} ${
          happyBurst ? 'is-happy' : ''
        } ${hudOpen ? 'is-active' : ''}`}
        style={{ transform: `rotate(${tiltDeg.toFixed(1)}deg)` }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        title="J.A.R.V.I.S. — Clic para abrir | Arrastra para mover | Clic derecho para menú"
      >
        <svg viewBox="0 0 110 118" width="94" height="100" className="coffee-svg">
          <defs>
            {/* 3D Roasted Coffee Bean Gradient */}
            <radialGradient id="beanBody" cx="38%" cy="30%" r="68%">
              <stop offset="0%" stopColor="#a46c44" />
              <stop offset="42%" stopColor="#6f4427" />
              <stop offset="82%" stopColor="#452715" />
              <stop offset="100%" stopColor="#28150a" />
            </radialGradient>

            {/* Glossy top highlight */}
            <radialGradient id="beanGloss" cx="35%" cy="22%" r="45%">
              <stop offset="0%" stopColor="rgba(255,235,215,0.45)" />
              <stop offset="100%" stopColor="rgba(255,235,215,0)" />
            </radialGradient>

            {/* Futuristic Visor Glass */}
            <linearGradient id="visorGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(46, 210, 130, 0.36)" />
              <stop offset="50%" stopColor="rgba(0, 229, 255, 0.24)" />
              <stop offset="100%" stopColor="rgba(31, 122, 76, 0.42)" />
            </linearGradient>

            {/* Headphone Band */}
            <linearGradient id="headbandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2a2421" />
              <stop offset="50%" stopColor="#5c524b" />
              <stop offset="100%" stopColor="#1c1816" />
            </linearGradient>

            {/* Soft drop shadow */}
            <filter id="mascotShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#140d09" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Subtle ground shadow */}
          <ellipse cx="55" cy="109" rx="24" ry="5" fill="rgba(20, 13, 9, 0.28)" className="mascot-shadow" />

          <g filter="url(#mascotShadow)">
            {/* Headphone Arch */}
            <path
              d="M 19 52 C 19 16, 91 16, 91 52"
              fill="none"
              stroke="url(#headbandGrad)"
              strokeWidth="6.5"
              strokeLinecap="round"
            />
            <path
              d="M 22 49 C 22 20, 88 20, 88 49"
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Cute Little Coffee Legs */}
            <path d="M 41 94 L 38 104 Q 40 107 44 104 L 46 95 Z" fill="#3a2011" />
            <path d="M 69 94 L 72 104 Q 70 107 66 104 L 64 95 Z" fill="#3a2011" />

            {/* Coffee Bean Main Body */}
            <ellipse cx="55" cy="60" rx="33" ry="39" fill="url(#beanBody)" stroke="#241309" strokeWidth="1.6" />
            <ellipse cx="55" cy="60" rx="32" ry="38" fill="url(#beanGloss)" />

            {/* Classic Coffee Bean Center Crease (top & bottom) */}
            <path
              d="M 55 21 C 51 28, 52 34, 54 39"
              fill="none"
              stroke="#241107"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M 55 83 C 57 89, 56 94, 54 99"
              fill="none"
              stroke="#241107"
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* Subtle Tech Circuit Lines on Bean Cheeks */}
            <path
              d="M 26 70 L 33 75 L 33 84"
              fill="none"
              stroke={hudOpen || hovering ? '#2ea463' : 'rgba(46,164,99,0.55)'}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="33" cy="84" r="1.8" fill="#2ea463" />
            <path
              d="M 84 70 L 77 75 L 77 84"
              fill="none"
              stroke={hudOpen || hovering ? '#2ea463' : 'rgba(46,164,99,0.55)'}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="77" cy="84" r="1.8" fill="#2ea463" />

            {/* Left & Right Headphone Earcups */}
            <rect x="13" y="45" width="11" height="22" rx="5.5" fill="#231e1c" stroke="#5c524b" strokeWidth="1.2" />
            <circle cx="18.5" cy="56" r="3.4" fill={hudOpen || hovering ? '#2ea463' : '#1f7a4c'} />

            <rect x="86" y="45" width="11" height="22" rx="5.5" fill="#231e1c" stroke="#5c524b" strokeWidth="1.2" />
            <circle cx="91.5" cy="56" r="3.4" fill={hudOpen || hovering ? '#2ea463' : '#1f7a4c'} />

            {/* Headset Mic Boom */}
            <path
              d="M 90 64 Q 87 77 71 78"
              fill="none"
              stroke="#4a423d"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="69.5" cy="78" r="2.6" fill="#2ea463" />

            {/* Eyebrows (expressive!) */}
            <path
              d={
                dragging
                  ? 'M 33 41 Q 41 37 47 41'
                  : hovering || happyBurst
                  ? 'M 33 42 Q 41 38 47 42'
                  : 'M 34 44 Q 41 41 47 44'
              }
              fill="none"
              stroke="#261208"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d={
                dragging
                  ? 'M 63 41 Q 69 37 77 41'
                  : hovering || happyBurst
                  ? 'M 63 42 Q 69 38 77 42'
                  : 'M 63 44 Q 69 41 76 44'
              }
              fill="none"
              stroke="#261208"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* INTERACTIVE EYES (Track cursor, blink, happy squint on click!) */}
            {happyBurst ? (
              <>
                <path
                  d="M 35 55 Q 41.5 47 48 55"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 62 55 Q 68.5 47 75 55"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </>
            ) : blinking ? (
              <>
                <line x1="35" y1="54" x2="48" y2="54" stroke="#1e1008" strokeWidth="3" strokeLinecap="round" />
                <line x1="62" y1="54" x2="75" y2="54" stroke="#1e1008" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Left Eye */}
                <ellipse cx="41.5" cy="54" rx="7.6" ry={dragging ? '8.8' : '8.2'} fill="#ffffff" />
                <circle
                  cx={41.5 + eyeOffset.x}
                  cy={54 + eyeOffset.y}
                  r={dragging ? '3.8' : '4.4'}
                  fill="#1f7a4c"
                />
                <circle
                  cx={41.5 + eyeOffset.x * 1.15}
                  cy={54 + eyeOffset.y * 1.15}
                  r={dragging ? '2.1' : '2.4'}
                  fill="#12100e"
                />
                <circle cx={43.2 + eyeOffset.x * 0.6} cy={51.6 + eyeOffset.y * 0.6} r="1.5" fill="#ffffff" />

                {/* Right Eye */}
                <ellipse cx="68.5" cy="54" rx="7.6" ry={dragging ? '8.8' : '8.2'} fill="#ffffff" />
                <circle
                  cx={68.5 + eyeOffset.x}
                  cy={54 + eyeOffset.y}
                  r={dragging ? '3.8' : '4.4'}
                  fill="#1f7a4c"
                />
                <circle
                  cx={68.5 + eyeOffset.x * 1.15}
                  cy={54 + eyeOffset.y * 1.15}
                  r={dragging ? '2.1' : '2.4'}
                  fill="#12100e"
                />
                <circle cx={70.2 + eyeOffset.x * 0.6} cy={51.6 + eyeOffset.y * 0.6} r="1.5" fill="#ffffff" />
              </>
            )}

            {/* Translucent Futuristic HUD Visor */}
            <rect
              x="25"
              y="44"
              width="60"
              height="20"
              rx="8"
              fill="url(#visorGlass)"
              stroke={hovering || hudOpen ? '#2ea463' : 'rgba(46, 196, 122, 0.72)'}
              strokeWidth="1.5"
            />
            <line x1="29" y1="48" x2="38" y2="48" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />

            {/* Expressive Mouth */}
            {dragging ? (
              <ellipse cx="55" cy="74" rx="4.2" ry="5.2" fill="#261108" stroke="#f7f4ef" strokeWidth="1" />
            ) : hovering || happyBurst ? (
              <path
                d="M 44 70 Q 55 82 66 70 Z"
                fill="#2a1208"
                stroke="#ffffff"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M 46 72 Q 55 79 64 72"
                fill="none"
                stroke="#220e06"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            )}

            {/* Rosy warm cheeks on hover/happy */}
            {(hovering || happyBurst) && (
              <>
                <ellipse cx="32" cy="67" rx="4" ry="2.2" fill="rgba(255, 145, 110, 0.45)" />
                <ellipse cx="78" cy="67" rx="4" ry="2.2" fill="rgba(255, 145, 110, 0.45)" />
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
