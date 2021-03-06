import {ISuite} from 'typings/suite-adapter';

const {isArray, find, get, values} = require('lodash');
const {isSuccessStatus, isFailStatus, isErroredStatus, isSkippedStatus, isUpdatedStatus} = require('../../common-utils');
const {getCommonErrors} = require('../../constants/errors');

const {NO_REF_IMAGE_ERROR} = getCommonErrors();

function hasFailedImages(result: {imagesInfo: any[], status: any}) {
    const {imagesInfo = [], status} = result;

    return imagesInfo.some(({status}) => isErroredStatus(status) || isFailStatus(status))
        || isErroredStatus(status) || isFailStatus(status);
}

export function hasNoRefImageErrors({imagesInfo = []}) {
    return Boolean(imagesInfo.filter((v) => get(v, 'reason.stack', '').startsWith(NO_REF_IMAGE_ERROR)).length);
}

export function hasFails(node: any) {
    const {result} = node;
    const isFailed = result && hasFailedImages(result);

    return isFailed || walk(node, hasFails);
}

export function isSuiteFailed(suite: ISuite) {
    return isFailStatus(suite.status) || isErroredStatus(suite.status);
}

export function isAcceptable({status, reason = ''}: {status: string, reason: any}) {
    const stack = reason && reason.stack;

    return isErroredStatus(status) && stack.startsWith(NO_REF_IMAGE_ERROR) || isFailStatus(status);
}

export function hasRetries(node: any) {
    const isRetried = node.retries && node.retries.length;
    return isRetried || walk(node, hasRetries);
}

export function allSkipped(node: any) {
    const {result} = node;
    const isSkipped = result && isSkippedStatus(result.status);

    return Boolean(isSkipped || walk(node, allSkipped, Array.prototype.every));
}

export function walk(node: any, cb: any, fn = Array.prototype.some) {
    return node.browsers && fn.call(node.browsers, cb) || node.children && fn.call(node.children, cb);
}

export function setStatusToAll(node: any, status: any) {
    if (isArray(node)) {
        node.forEach((n: any) => setStatusToAll(n, status));
    }

    const currentStatus = get(node, 'result.status', node.status);
    if (isSkippedStatus(currentStatus)) {
        return;
    }
    node.result
        ? (node.result.status = status)
        : node.status = status;

    // @ts-ignore
    return walk(node, (n: any) => setStatusToAll(n, status), Array.prototype.forEach);
}

export function findNode(node: any, suitePath: any): any {
    suitePath = suitePath.slice();
    if (!node.children) {
        node = values(node);
        const tree = {
            name: 'root',
            children: node
        };
        return findNode(tree, suitePath);
    }

    const pathPart = suitePath.shift();
    const child = find(node.children, {name: pathPart});

    if (!child) {
        return;
    }

    if (child.name === pathPart && !suitePath.length) {
        return child;
    }

    return findNode(child, suitePath);
}

export function getColorState(status?: string) {
    switch (status) {
        case 'success':
        case 'update':
        case 'passed': {
            return '#1da83f';
        }
        case 'fail':
        case 'failed':
        case 'error': {
            return  '#d93845';
        }
        case 'skip':
        case 'skipped': {
            return '#6a737d';
        }
        default:
            return '#333333';
    }
}

export function setStatusForBranch(nodes: any, suitePath: any, status: any) {
    const node = findNode(nodes, suitePath);
    if (!node) {
        return;
    }

    if ((isSuccessStatus(status) || isUpdatedStatus(status)) && hasFails(node)) {
        return;
    }

    node.status = status;
    suitePath = suitePath.slice(0, -1);
    setStatusForBranch(nodes, suitePath, status);
}
