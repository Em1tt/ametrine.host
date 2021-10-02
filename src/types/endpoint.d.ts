// api endpoint, like amethyst.host/api/echo?params
import { Request, Response } from "express";

export interface Endpoint {
  prop: {
    readonly name      : string;
    readonly desc?     : string;
    readonly rateLimit?: {
      readonly max     : number,
      readonly time    : number
    }
    run: (req: Request,
          res: Response) 
            => void;
  }
}
