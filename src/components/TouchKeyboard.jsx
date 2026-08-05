const { useState, useEffect, useRef } = React;

const TOUCH_KEYBOARD_IGNORED_TYPES = new Set([
    'button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'
]);

const isTouchKeyboardTarget = (target) => {
    if (!target || target.disabled || target.readOnly || target.dataset.touchKeyboard === 'off') return false;
    if (target instanceof HTMLTextAreaElement) return true;
    if (!(target instanceof HTMLInputElement)) return false;
    return !TOUCH_KEYBOARD_IGNORED_TYPES.has(String(target.type || 'text').toLowerCase());
};

const getTouchKeyboardLabel = (target) => {
    const label = target.getAttribute('aria-label')
        || target.labels?.[0]?.innerText
        || target.getAttribute('placeholder')
        || target.getAttribute('name')
        || target.getAttribute('id')
        || 'Input value';
    return String(label).replace(/\s+/g, ' ').trim().slice(0, 90) || 'Input value';
};

const getTouchKeyboardMode = (target, inputMode) => {
    const type = String(target.type || 'text').toLowerCase();
    if (type === 'date') return 'date';
    if (type === 'number' || type === 'tel' || inputMode === 'numeric' || inputMode === 'decimal') return 'number';
    return 'text';
};

const restoreTouchKeyboardTarget = (session) => {
    const target = session?.target;
    if (!target) return;
    target.classList.remove('touch-keyboard-target');
    if (session.originalInputMode === null) target.removeAttribute('inputmode');
    else target.setAttribute('inputmode', session.originalInputMode);
};

const writeTouchKeyboardValue = (target, value) => {
    const prototype = target instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (valueSetter) valueSetter.call(target, value);
    else target.value = value;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
};

const formatTouchKeyboardDate = (digits) => {
    const padded = String(digits || '').padEnd(8, '_').slice(0, 8);
    return `${padded.slice(0, 4)} - ${padded.slice(4, 6)} - ${padded.slice(6, 8)}`;
};

const getLocalIsoDate = () => {
    const now = new Date();
    const year = String(now.getFullYear()).padStart(4, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

const TouchKeyboardKey = ({ children, onPress, kind = '', flex = 1, disabled = false, ariaLabel }) => (
    <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        onClick={onPress}
        className={`touch-keyboard-key ${kind ? `touch-keyboard-key--${kind}` : ''}`}
        style={{ flex }}
    >
        {children}
    </button>
);

const TouchKeyboard = ({ theme = 'dark' }) => {
    const [session, setSession] = useState(null);
    const [replaceOnNext, setReplaceOnNext] = useState(false);
    const [shift, setShift] = useState(false);
    const [symbolLayout, setSymbolLayout] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const sessionRef = useRef(null);

    const updateSession = (updater) => {
        setSession((current) => {
            if (!current) return current;
            const next = updater(current);
            sessionRef.current = next;
            return next;
        });
    };

    const closeKeyboard = () => {
        const current = sessionRef.current;
        restoreTouchKeyboardTarget(current);
        current?.target?.blur();
        sessionRef.current = null;
        setSession(null);
        setError('');
        setReplaceOnNext(false);
    };

    useEffect(() => {
        const openKeyboard = (target) => {
            if (!isTouchKeyboardTarget(target)) return;
            if (sessionRef.current?.target === target) return;

            restoreTouchKeyboardTarget(sessionRef.current);
            const originalInputMode = target.getAttribute('inputmode');
            const mode = getTouchKeyboardMode(target, originalInputMode);
            const rawValue = String(target.value ?? '');
            const step = target.getAttribute('step');
            const numericStep = Number(step);
            const next = {
                target,
                mode,
                type: String(target.type || 'text').toLowerCase(),
                label: getTouchKeyboardLabel(target),
                draft: mode === 'date' ? rawValue.replace(/\D/g, '').slice(0, 8) : rawValue,
                originalInputMode,
                min: target.getAttribute('min'),
                max: target.getAttribute('max'),
                required: target.required,
                maxLength: target.maxLength > 0 ? target.maxLength : null,
                secure: String(target.type || '').toLowerCase() === 'password',
                allowDecimal: originalInputMode === 'decimal'
                    || step === 'any'
                    || (step !== null && Number.isFinite(numericStep) && !Number.isInteger(numericStep))
                    || rawValue.includes('.'),
                allowNegative: target.getAttribute('min') === null
                    || Number(target.getAttribute('min')) < 0
                    || rawValue.startsWith('-')
            };

            target.setAttribute('inputmode', 'none');
            target.classList.add('touch-keyboard-target');
            sessionRef.current = next;
            setSession(next);
            setReplaceOnNext(Boolean(rawValue));
            setShift(false);
            setSymbolLayout(false);
            setShowPassword(false);
            setError('');
            target.focus({ preventScroll: true });
        };

        const handlePointerDown = (event) => {
            const target = event.target?.closest?.('input, textarea');
            if (!isTouchKeyboardTarget(target)) return;
            event.preventDefault();
            openKeyboard(target);
        };

        const handleFocusIn = (event) => {
            if (isTouchKeyboardTarget(event.target)) openKeyboard(event.target);
        };

        document.addEventListener('pointerdown', handlePointerDown, true);
        document.addEventListener('focusin', handleFocusIn, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
            document.removeEventListener('focusin', handleFocusIn, true);
            restoreTouchKeyboardTarget(sessionRef.current);
        };
    }, []);

    if (!session) return null;

    const setDraft = (updater) => {
        updateSession((current) => ({ ...current, draft: updater(current.draft, current) }));
        setError('');
    };

    const insertValue = (value) => {
        setDraft((draft, current) => {
            const base = replaceOnNext ? '' : draft;
            if (current.mode === 'date') return `${base}${String(value).replace(/\D/g, '')}`.slice(0, 8);

            if (current.mode === 'number') {
                if (value === '.') {
                    if (!current.allowDecimal || base.includes('.')) return base;
                    return base === '' || base === '-' ? `${base}0.` : `${base}.`;
                }
                return `${base}${value}`;
            }

            const next = `${base}${value}`;
            return current.maxLength ? next.slice(0, current.maxLength) : next;
        });
        setReplaceOnNext(false);
    };

    const backspace = () => {
        setDraft((draft) => replaceOnNext ? '' : draft.slice(0, -1));
        setReplaceOnNext(false);
    };

    const clearValue = () => {
        setDraft(() => '');
        setReplaceOnNext(false);
    };

    const toggleSign = () => {
        if (!session.allowNegative) return;
        setDraft((draft) => draft.startsWith('-') ? draft.slice(1) : `-${draft}`);
        setReplaceOnNext(false);
    };

    const commitValue = () => {
        const current = sessionRef.current;
        if (!current || !document.documentElement.contains(current.target)) {
            closeKeyboard();
            return;
        }

        let value = current.draft;
        if (current.mode === 'number') {
            value = value.trim().replace(',', '.');
            if (value !== '') {
                const parsed = Number(value);
                if (!Number.isFinite(parsed)) {
                    setError('Enter a valid number.');
                    return;
                }
                if (current.min !== null && parsed < Number(current.min)) {
                    setError(`Minimum allowed value is ${current.min}.`);
                    return;
                }
                if (current.max !== null && parsed > Number(current.max)) {
                    setError(`Maximum allowed value is ${current.max}.`);
                    return;
                }
                if (value.endsWith('.')) value = value.slice(0, -1);
            }
        }

        if (current.mode === 'date' && value !== '') {
            if (value.length !== 8) {
                setError('Enter the complete date as YYYY-MM-DD.');
                return;
            }
            const year = Number(value.slice(0, 4));
            const month = Number(value.slice(4, 6));
            const day = Number(value.slice(6, 8));
            const date = new Date(Date.UTC(year, month - 1, day));
            if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
                setError('Enter a valid calendar date.');
                return;
            }
            value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (current.min !== null && value < current.min) {
                setError(`Earliest allowed date is ${current.min}.`);
                return;
            }
            if (current.max !== null && value > current.max) {
                setError(`Latest allowed date is ${current.max}.`);
                return;
            }
        }

        if (current.required && value === '') {
            setError('This value is required.');
            return;
        }

        writeTouchKeyboardValue(current.target, value);
        restoreTouchKeyboardTarget(current);
        current.target.blur();
        sessionRef.current = null;
        setSession(null);
        setError('');
    };

    const alphaRows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];
    const symbolRows = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
        ['-', '_', '=', '+', '[', ']', '{', '}', '\\', '/'],
        [':', ';', "'", '"', ',', '.', '?', '~', '`', '|']
    ];
    const rows = symbolLayout ? symbolRows : alphaRows;
    const displayValue = session.mode === 'date'
        ? formatTouchKeyboardDate(session.draft)
        : session.secure && !showPassword
            ? '*'.repeat(session.draft.length)
            : session.draft;
    const limitText = session.mode === 'date'
        ? 'Format: YYYY-MM-DD'
        : session.mode === 'number' && (session.min !== null || session.max !== null)
            ? `Allowed: ${session.min ?? '-infinity'} to ${session.max ?? '+infinity'}`
            : replaceOnNext && session.draft
                ? 'Current value selected. The next key replaces it.'
                : 'Tap Done to apply the value.';

    const keyboard = (
        <div
            className="touch-keyboard-overlay"
            data-touch-keyboard-root
            role="presentation"
            onPointerDown={(event) => {
                if (event.target === event.currentTarget) closeKeyboard();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label={`Touch keyboard for ${session.label}`}
                data-theme={theme}
                className={`touch-keyboard-panel ${session.mode !== 'text' ? 'touch-keyboard-panel--compact' : ''}`}
            >
                <header className="touch-keyboard-header">
                    <div className="touch-keyboard-topline">
                        <div className="touch-keyboard-heading">
                            <span className="touch-keyboard-caption">Touch input</span>
                            <strong title={session.label}>{session.label}</strong>
                        </div>
                        <div className="touch-keyboard-header-actions">
                            {session.secure && (
                                <button type="button" className="touch-keyboard-small-button" onClick={() => setShowPassword((shown) => !shown)}>
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            )}
                            <button type="button" className="touch-keyboard-small-button touch-keyboard-small-button--cancel" onClick={closeKeyboard}>
                                Cancel
                            </button>
                        </div>
                    </div>
                    <div className={`touch-keyboard-display ${!displayValue ? 'touch-keyboard-display--empty' : ''}`}>
                        {displayValue || 'Enter a value'}
                    </div>
                    <div className={`touch-keyboard-message ${error ? 'touch-keyboard-message--error' : ''}`} role={error ? 'alert' : 'status'}>
                        {error || limitText}
                    </div>
                </header>

                {session.mode === 'text' ? (
                    <div className="touch-keyboard-body touch-keyboard-body--text">
                        {rows.map((row, rowIndex) => (
                            <div className="touch-keyboard-row" key={`${symbolLayout ? 'symbol' : 'alpha'}-${rowIndex}`}>
                                {rowIndex === 3 && !symbolLayout && (
                                    <TouchKeyboardKey kind={shift ? 'active' : 'modifier'} flex={1.45} onPress={() => setShift((active) => !active)}>
                                        Shift
                                    </TouchKeyboardKey>
                                )}
                                {row.map((key) => {
                                    const output = !symbolLayout && shift ? key.toUpperCase() : key;
                                    return (
                                        <TouchKeyboardKey
                                            key={key}
                                            onPress={() => {
                                                insertValue(output);
                                                if (!symbolLayout && shift) setShift(false);
                                            }}
                                        >
                                            {output}
                                        </TouchKeyboardKey>
                                    );
                                })}
                                {rowIndex === 3 && (
                                    <TouchKeyboardKey kind="modifier" flex={1.6} onPress={backspace}>Backspace</TouchKeyboardKey>
                                )}
                            </div>
                        ))}
                        <div className="touch-keyboard-row">
                            <TouchKeyboardKey kind="modifier" flex={1.4} onPress={() => { setSymbolLayout((active) => !active); setShift(false); }}>
                                {symbolLayout ? 'ABC' : '?123'}
                            </TouchKeyboardKey>
                            <TouchKeyboardKey kind="danger" flex={1.25} onPress={clearValue}>Clear</TouchKeyboardKey>
                            <TouchKeyboardKey flex={4.5} ariaLabel="Space" onPress={() => insertValue(' ')}>Space</TouchKeyboardKey>
                            <TouchKeyboardKey kind="primary" flex={1.8} onPress={commitValue}>Done</TouchKeyboardKey>
                        </div>
                    </div>
                ) : (
                    <div className="touch-keyboard-body touch-keyboard-number-grid">
                        {['7', '8', '9'].map((key) => <TouchKeyboardKey key={key} onPress={() => insertValue(key)}>{key}</TouchKeyboardKey>)}
                        <TouchKeyboardKey kind="modifier" onPress={backspace}>Backspace</TouchKeyboardKey>
                        {['4', '5', '6'].map((key) => <TouchKeyboardKey key={key} onPress={() => insertValue(key)}>{key}</TouchKeyboardKey>)}
                        <TouchKeyboardKey kind="danger" onPress={clearValue}>Clear</TouchKeyboardKey>
                        {['1', '2', '3'].map((key) => <TouchKeyboardKey key={key} onPress={() => insertValue(key)}>{key}</TouchKeyboardKey>)}
                        {session.mode === 'date' ? (
                            <TouchKeyboardKey kind="modifier" onPress={() => { setDraft(() => getLocalIsoDate()); setReplaceOnNext(false); }}>Today</TouchKeyboardKey>
                        ) : (
                            <TouchKeyboardKey kind="modifier" disabled={!session.allowNegative} onPress={toggleSign}>+/-</TouchKeyboardKey>
                        )}
                        <TouchKeyboardKey onPress={() => insertValue('0')}>0</TouchKeyboardKey>
                        <TouchKeyboardKey onPress={() => insertValue('00')}>00</TouchKeyboardKey>
                        {session.mode === 'date' ? (
                            <TouchKeyboardKey kind="modifier" disabled>YYYY-MM-DD</TouchKeyboardKey>
                        ) : (
                            <TouchKeyboardKey kind="modifier" disabled={!session.allowDecimal} onPress={() => insertValue('.')}>.</TouchKeyboardKey>
                        )}
                        <TouchKeyboardKey kind="primary" onPress={commitValue}>Done</TouchKeyboardKey>
                    </div>
                )}
            </section>
        </div>
    );

    return ReactDOM.createPortal(keyboard, document.body);
};
