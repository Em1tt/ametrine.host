// module type for safety
export type Mod = {
  name : string;
  start: (util: JSON) => void;
  stop : () => void;
}
