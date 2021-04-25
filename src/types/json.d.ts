// for importing .json files
/* this was the cooler version that didn't work
type Value = string       |
             number       |
             boolean      |
             null         |
             Array<Value> |
             { [Key: string]: Value };
*/

declare module "*.json" {
  // please don't use any
  // always try to do stuff the cool ts way
  const          value: /* Value */ any;
  export default value;
}
