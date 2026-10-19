import { useState } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";

export default function RatingStars({ value, onChange, size = 32 }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === "function";
  const active = hover || value || 0;
  const Wrapper = interactive ? "fieldset" : "div";

  return (
    <Wrapper className="m-0 flex min-w-0 items-center gap-1 border-0 p-0" role={interactive ? undefined : "img"} aria-label={`${value ?? 0} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange(star)}
          aria-label={interactive ? `${star} ดาว` : undefined}
          aria-pressed={interactive ? star <= (value || 0) : undefined}
          className={clsx("transition-transform", interactive ? "active:scale-90" : "cursor-default")}
        >
          <Star
            width={size}
            height={size}
            className={clsx(
              "transition-colors",
              star <= active ? "fill-amber-400 text-amber-500" : "fill-white text-slate-300"
            )}
          />
        </button>
      ))}
    </Wrapper>
  );
}
