// for importing .json files
type Value = string       |
             number       |
             boolean      |
             null         |
             Array<Value> |
             { [Key: string]: Value };

declare module "*.json" {
  const          value: Value;
  export default value;
}
