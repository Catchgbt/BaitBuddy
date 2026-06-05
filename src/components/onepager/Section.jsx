import React, { forwardRef } from "react";

export default forwardRef(function Section({ id, title, children, className = "" }, ref) {
  return (
    <section id={id} ref={ref} className={`scroll-mt-16 py-10 sm:py-14 ${className}`}>
      <div className="max-w-6xl mx-auto px-4">
        {title && <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{title}</h2>}
        {children}
      </div>
    </section>
  );
});