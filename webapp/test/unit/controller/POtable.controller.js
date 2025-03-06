/*global QUnit*/

sap.ui.define([
	"comiherbtm/ztm_iherbpurchaseorders/controller/POtable.controller"
], function (Controller) {
	"use strict";

	QUnit.module("POtable Controller");

	QUnit.test("I should test the POtable controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
