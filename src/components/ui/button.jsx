import { cn } from "../../lib/utils";


export function Button({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition",
        className
      )}
    >
      {children}
    </button>
  );
}
