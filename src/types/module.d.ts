// module type for safety

export type Module = {
  name : string;
  start: (util: JSON) => void;
  stop : () => void;
}
