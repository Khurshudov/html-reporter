import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import { TestAdapterType } from 'typings/test-adapter';
const Promise = require('bluebird');
const utils = require('./server-utils');

function saveAssertViewImages(testResult: TestAdapterType, reportPath: string) {
    return Promise.map(testResult.assertViewResults, (assertResult: any) => {
        const {stateName} = assertResult;
        const actions = [];

        if (!(assertResult instanceof Error)) {
            actions.push(utils.copyImageAsync(
                assertResult.refImagePath,
                utils.getReferenceAbsolutePath(testResult, reportPath, stateName)
            ));
        }

        if (testResult.isImageDiffError && testResult.isImageDiffError(assertResult)) {
            actions.push(
                exports.saveTestCurrentImage(testResult, reportPath, stateName),
                utils.saveDiff(
                    assertResult,
                    utils.getDiffAbsolutePath(testResult, reportPath, stateName)
                ),
                utils.copyImageAsync(
                    assertResult.refImagePath,
                    utils.getReferenceAbsolutePath(testResult, reportPath, stateName)
                )
            );
        }

        if (testResult.isNoRefImageError(assertResult)) {
            actions.push(exports.saveTestCurrentImage(testResult, reportPath, stateName));
        }

        return Promise.all(actions);
    });
}

exports.saveTestImages = (testResult: TestAdapterType, reportPath: string) => {
    if (testResult.assertViewResults) {
        return saveAssertViewImages(testResult, reportPath);
    }

    const actions = [
        utils.copyImageAsync(
            testResult.referencePath,
            utils.getReferenceAbsolutePath(testResult, reportPath)
        )
    ];

    if (testResult.hasDiff()) {
        actions.push(
            exports.saveTestCurrentImage(testResult, reportPath),
            utils.saveDiff(
                testResult,
                utils.getDiffAbsolutePath(testResult, reportPath)
            )
        );
    }

    return Promise.all(actions);
};

exports.saveTestCurrentImage = (testResult: TestAdapterType, reportPath: string, stateName: string) => {
    let src;

    if (stateName) {
        // @ts-ignore
        src = _.find(testResult.assertViewResults, {stateName}).currentImagePath;
    } else {
        src = testResult.getImagePath() || testResult.currentPath || testResult.screenshot;
    }

    return src
        ? utils.copyImageAsync(src, utils.getCurrentAbsolutePath(testResult, reportPath, stateName))
        : Promise.resolve();
};

exports.updateReferenceImage = (testResult: TestAdapterType, reportPath: string, stateName: string) => {
    const src = testResult.actualPath
        ? path.resolve(reportPath, testResult.actualPath)
        : utils.getCurrentAbsolutePath(testResult, reportPath, stateName);

    return Promise.all([
        utils.copyImageAsync(src, testResult.getImagePath(stateName)),
        utils.copyImageAsync(src, utils.getReferenceAbsolutePath(testResult, reportPath, stateName))
    ]);
};

exports.saveBase64Screenshot = (testResult: TestAdapterType, reportPath: string) => {
    if (!testResult.screenshot) {
        utils.logger.warn('Cannot save screenshot on reject');

        return Promise.resolve();
    }

    const destPath = utils.getCurrentAbsolutePath(testResult, reportPath);

    return utils.makeDirFor(destPath)
        // @ts-ignore
        .then(() => fs.writeFileAsync(destPath, new Buffer(testResult.screenshot, 'base64'), 'base64'));
};
