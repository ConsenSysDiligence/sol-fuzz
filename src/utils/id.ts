let ctr = 0;

export class Id {
    protected _id: number;

    get id(): number {
        return this._id;
    }

    constructor() {
        this._id = ctr++;
    }
}
