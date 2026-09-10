import { useEffect, useRef } from "react";

/**
 * Locks body scroll and handles Escape key for any open modal/drawer.
 *
 * Strategy: position:fixed + negative top preserves scroll position while
 * locking the body. This avoids overflow:hidden on <html> which breaks
 * position:fixed on iOS Safari.
 */
export function useModal(isOpen: boolean, onClose?: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    // Save current computed styles
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevBodyPaddingRight = body.style.paddingRight;
    const prevHtmlOverflow = html.style.overflow;

    // Lock scroll via position:fixed (preserves scroll position via negative top)
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    // Prevent html from establishing a scroll container
    html.style.overflow = "hidden";

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCloseRef.current) {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      // Restore styles
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      body.style.paddingRight = prevBodyPaddingRight;
      html.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", handleEsc);

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
}
