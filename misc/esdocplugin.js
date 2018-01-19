/**
 * esdoc dosn't support commonjs module export just ES6 module export
 * while recent nodejs doesn't support ES6 modlue export (maybe never will)
 * This esdoc plugin is a workaround for this stubborn situation
 * @see https://github.com/esdoc/esdoc/issues/168
 */
exports.onHandleCode = function (ev) {
  ev.data.code = ev.data.code
	.replace(/class(?=\ [A-Z][a-zA-Z0-9]*[ ]*{)/g, 'export class');
};