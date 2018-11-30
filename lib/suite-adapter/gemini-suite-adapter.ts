import {SuiteAdapter} from './suite-adapter';

import {ISuite} from 'typings/suite-adapter';
import {IOptions} from 'typings/options';

export default class GeminiSuiteAdapter extends SuiteAdapter {
    constructor(
        protected _suite: ISuite,
        protected _config: IOptions = {}
    ) {
        super(_suite, _config);
    }

    get skipComment() {
        return this._wrapSkipComment(this._suite.skipComment);
    }

    getUrl(opts: IOptions = {}) {
        // @ts-ignore
        const browserConfig = this._config.forBrowser(opts.browserId);
        const url = browserConfig.getAbsoluteUrl(this._suite.url as string);

        return this._configureUrl(url, opts.baseHost || '');
    }

    get fullUrl() {
        return this._suite.fullUrl;
    }

    get path() {
        return this._suite.path;
    }

    get file() {
        return this._suite.file;
    }

    get fullName() {
        return this._suite.fullName;
    }
};
