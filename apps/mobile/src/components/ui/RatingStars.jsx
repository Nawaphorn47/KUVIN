import { useState } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";

export default function RatingStars({ value, onChange, size = 32 }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === "function";
  const active = hover || value || 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange(star)}
          className={clsx(!interactive && "cursor-default")}
        >
          <Star
            width={size}
            height={size}
            className={clsx(
              "transition-colors",
              star <= active ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"
            )}
          />
        </button>
      ))}
    </div>
  );
}
