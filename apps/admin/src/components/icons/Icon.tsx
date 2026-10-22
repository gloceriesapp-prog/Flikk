import { forwardRef, type ReactNode, type SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string;
  title?: string;
}

export type IconComponent = ReturnType<typeof createIcon>;

/** Local Iconly SVGs: inherit text colour and stay decorative unless labelled. */
export function createIcon(
  name: string,
  viewBox: string,
  render: (strokeWidth: IconProps['strokeWidth']) => ReactNode,
) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function IconlyIcon(
    { size = 24, title, strokeWidth, color = 'currentColor', children, ...props }, ref,
  ) {
    const labelled = Boolean(title || props['aria-label'] || props['aria-labelledby']);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        color={color}
        focusable="false"
        aria-hidden={labelled ? undefined : true}
        role={labelled ? 'img' : undefined}
        aria-label={title}
        data-iconly={name}
        {...props}
        ref={ref}
      >
        {title ? <title>{title}</title> : null}
        {render(strokeWidth)}
        {children}
      </svg>
    );
  });
  Icon.displayName = `Iconly(${name})`;
  return Icon;
}
