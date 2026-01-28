(() => {
  const ICON_BASE_PATH = 'src/assets/icons';
  const ICON_CACHE = new Map();
  const ICON_LOADING = new Map();

  const getIconPath = (name) => `${ICON_BASE_PATH}/${name}.svg`;

  const loadIcon = (name) => {
    if (!name) return Promise.resolve(null);
    if (ICON_CACHE.has(name)) return Promise.resolve(ICON_CACHE.get(name));
    if (ICON_LOADING.has(name)) return ICON_LOADING.get(name);

    const path = getIconPath(name);
    const request = fetch(path)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        ICON_CACHE.set(name, text);
        return text;
      })
      .catch(() => {
        ICON_CACHE.set(name, null);
        return null;
      });

    ICON_LOADING.set(name, request);
    return request;
  };

  const Icon = ({ name, className, ...rest }) => {
    const [svg, setSvg] = React.useState(ICON_CACHE.get(name) || null);

    React.useEffect(() => {
      let active = true;
      loadIcon(name).then((text) => {
        if (!active) return;
        setSvg(text);
      });
      return () => {
        active = false;
      };
    }, [name]);

    const mergedClass = `icon ${className || ''}`.trim();

    if (!svg) {
      return <span className={mergedClass} data-icon={name} {...rest} />;
    }

    return (
      <span
        className={mergedClass}
        data-icon={name}
        {...rest}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  };

  window.IconLibrary = { Icon, loadIcon };
})();
