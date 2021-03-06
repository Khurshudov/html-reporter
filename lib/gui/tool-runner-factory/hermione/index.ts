import _ from 'lodash';
import {ISuite} from 'typings/suite-adapter';
import {ITestResult, IMetaInfo, ITestTool} from 'typings/test-adapter';
const BaseToolRunner = require('../base-tool-runner');
const Runner = require('../runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {formatTests} = require('../utils');
const {formatId, getShortMD5, mkFullTitle} = require('./utils');

interface IImageInfo {
    status?: string;
    actualPath?: string;
    stateName?: string;
}

module.exports = class HermioneRunner extends BaseToolRunner {
    constructor(paths: string[], tool: ITestTool, configs: any) {
        super(paths, tool, configs);

        this._tests = {};
    }

    run(tests = []) {
        const {grep, set: sets, browser: browsers} = this._globalOpts;
        const formattedTests = _.flatMap([].concat(tests), (test: ITestResult) => formatTests(test));
        return Runner.create(this._toolName, this._collection, formattedTests)
            .run((collection: ISuite) => this._tool.run(collection, {grep, sets, browsers}));
    }

    _handleRunnableCollection() {
        this._collection.eachTest((test: ITestResult, browserId: string) => {
            if (test.disabled || test.silentSkip) {
                return;
            }

            const testId = formatId(test.id && test.id(), browserId);
            this._tests[testId] = _.extend(test, {browserId});

            test.pending
                ? this._reportBuilder.addSkipped(test)
                : this._reportBuilder.addIdle(test);
        });

        this._fillTestsTree();
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._tool, this._reportBuilder, this._eventSource, this._reportPath);
    }

    _prepareUpdateResult(test: ITestResult) {
        const {browserId, attempt} = test;
        const fullTitle = mkFullTitle(test);
        const testId = formatId(getShortMD5(fullTitle), browserId);
        const testResult = this._tests[testId];
        const {sessionId, url}: IMetaInfo = test.metaInfo as IMetaInfo;
        const imagesInfo = test.imagesInfo && test.imagesInfo.map((imageInfo: IImageInfo) => {
            const {stateName} = imageInfo;
            const imagePath = browserId && this._tool.config.browsers[browserId].getScreenshotPath(testResult, stateName);

            return _.extend(imageInfo, {imagePath});
        });

        return _.merge({}, testResult, {imagesInfo, sessionId, attempt, meta: {url}, updated: true});
    }
};
