/// ======== Match Patterns ========================
export class BaseMatchPattern {
    constructor(public binding: string | undefined) {}
}

export class MatchLiteral extends BaseMatchPattern {
    constructor(
        binding: string | undefined,
        public type: string,
        public value: bigint | string
    ) {
        super(binding);
    }
}

export class MatchAny extends BaseMatchPattern {}

/**
 * A pattern specifies the name of some
 */
export class MatchNode extends BaseMatchPattern {
    constructor(
        binding: string | undefined,
        public type: string,
        public args: BaseMatchPattern[]
    ) {
        super(binding);
    }
}

export class MatchArray extends BaseMatchPattern {
    constructor(
        binding: string | undefined,
        public components: BaseMatchPattern[]
    ) {
        super(binding);
    }
}

export class MatchElipsis extends BaseMatchPattern {}

/// ======== Rewrite Patterns ========================
export class BaseRewritePattern {}

export class RWNode extends BaseRewritePattern {
    constructor(
        public type: string,
        public args: BaseRewritePattern[]
    ) {
        super();
    }
}

export class RWLiteral extends BaseRewritePattern {
    constructor(public value: string | bigint) {
        super();
    }
}

export class RWVar extends BaseRewritePattern {
    constructor(public name: string) {
        super();
    }
}
