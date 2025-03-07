sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (Controller, MessageBox, MessageToast) => {
    "use strict";

    return Controller.extend("com.iherb.tm.ztmiherbpurchaseorders.controller.POtable", {
        onInit() {
            this._oPOTableModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(this._oPOTableModel, "POTableModel");

            this._oPkgModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(this._oPkgModel, "PkgModel");

            this._oPartnerModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(this._oPartnerModel, "PartnerModel");
            this.onReadOdata();
            this.onReadPackOdata();
        },

        onReadOdata: function () {
            sap.ui.core.BusyIndicator.show();
            var oDataModel = this.getOwnerComponent().getModel();
            var that = this;

            // oDataModel.read("/ZC_FuItemList?$expand=ZC_PKG_UNIT&$select=ID,Name,ZC_PKG_UNIT/PkgUni,ZC_PKG_UNIT/Descr")
            oDataModel.read("/ZC_FuTorItem", {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    console.log("PO OData loaded/Response:", oData);
                    oData.results.forEach(function (item) {
                        item.FreightUnitEditFlag = true; // Add the flag manually
                    }),
                        that._oPOTableModel.setData({ FreightOrders: oData.results });
                    console.log("Updated Data with FreightUnitEditFlag:", that._oPOTableModel.getData());
                }.bind(this),
                error: function (oerror) {
                    sap.ui.core.BusyIndicator.hide();
                    console.log("PO data not loaded", oerror);
                }.bind(this),
            });
        },

        onReadPackOdata: function () {
            var oDataModel = this.getOwnerComponent().getModel();

            oDataModel.read("/ZI_PKG_UNIT", {
                success: function (oresponse) {
                    sap.ui.core.BusyIndicator.hide();
                    this._oPkgModel.setData(oresponse.results);
                    console.log("Pack Type Data:", oresponse.results);
                }.bind(this),
                error: function (oerror) {
                    console.log("Pack Type data not loaded", oerror);
                }.bind(this),
            });

            oDataModel.read("/ZI_PARTNER_LOC", {
                success: function (oresponse) {
                    sap.ui.core.BusyIndicator.hide();
                    this._oPartnerModel.setData(oresponse.results);
                    console.log("Patner Data:", oresponse.results);
                }.bind(this),
                error: function (oerror) {
                    console.log("Patner data not loaded", oerror);
                }.bind(this),
            });
        },

        onRefresh: function () {
            this.byId("smartTable").rebindTable();
        },

        openConfirmDialog: async function () {
            var aValidation = this._oPOTableModel.getProperty("/cValidData");

            if (!aValidation) {
                this.oCompleteDialog = await this.loadFragment({
                    name: "com.iherb.tm.ztmiherbpurchaseorders.fragment.supplierConfirmBox",
                });
                this.oView.addDependent(this.oCompleteDialog);
                this.oCompleteDialog.open();
            }
        },

        onPressCancel: function () {
            this.oCompleteDialog.close();
            this.oCompleteDialog.destroy();
            this.oCompleteDialog = null;
        },

        onPressSave: function () {
            var that = this;
            this.onPressCancel();
            var i;
            let oUpdateModel = this.getView().getModel("POTableModel");
            let gettingInternalTable = this.byId("smartTable").getTable();
            let gettingAllRows = gettingInternalTable.getBinding().aKeys;
            let oSelIndices = gettingInternalTable.getSelectedIndices();

            for (i = 0; i < oSelIndices.length; i++) {
                var oFreightOrder = this.getView().getModel().getObject("/" + gettingAllRows[oSelIndices[i]]);

                // Get Pack Data
                var oPackData = this.getView().getModel("PkgModel").getData();
                // Get Freight Orders
                var oPOTableModel = this.getView().getModel("POTableModel");
                var oFreightOrders = oPOTableModel.getData().FreightOrders;
                // Attach Partner Data into each Freight Order
                oFreightOrders.forEach(order => {
                    order.PackUnit = oPackData;
                });
                // Update Model
                oPOTableModel.setData({ FreightOrders: oFreightOrders });

                var sFO = oFreightOrder.DbKey;
                var sPOPayload = {
                    "DbKey": sFO,
                    "TorId": oFreightOrder.TorId,
                    "PkgQuaPcsVal": oFreightOrder.PkgQuaPcsVal,
                    "QuaPcsUni":oFreightOrder.QuaPcsUni,
                    "PkgPcsVal": oFreightOrder.PkgPcsVal,
                    // "PkgUni": oFreightOrder.PackUnit.PkgUni,
                    "PkgLength": oFreightOrder.PkgLength,
                    "PkgWidth": oFreightOrder.PkgWidth,
                    "PkgHeight": oFreightOrder.PkgHeight,
                    "PkgMeasuom": oFreightOrder.PkgMeasuom,
                    "PkgWeiVal": oFreightOrder.PkgWeiVal,
                    "GroWeiUni": oFreightOrder.GroWeiUni,
                    "PkgId": oFreightOrder.PkgId,
                    "PkgPickupDt": oFreightOrder.PkgPickupDt,
                    // "LocDescr":oFreightOrder.LocDescr
                };
                var path = "/ZC_FuTorItem(guid'" + sFO + "')";
                this.getView().getModel().update(path, sPOPayload, {
                    success: function (oData, response) {
                        MessageToast.show(
                            "Freight Unit " +
                            oFreightOrder.TorId +
                            " Updated successfully"
                        );
                        oUpdateModel.refresh(true);
                    },
                    error: function (oError) {
                        MessageToast.show(
                            "Error " +
                            oFreightOrder.TorId +
                            " Update request failed"
                        );
                    },
                });
            }
        },

        onSubmitPress: function () {
            var i;
            var that = this;
            var cValidErr = false;
            this._oPOTableModel.setProperty("/cValidData", cValidErr);

            let oUpdateModel = this.getView().getModel("POTableModel");
            let gettingInternalTable = this.byId("smartTable").getTable();
            console.log("Smart Table:", gettingInternalTable); // Debugging
            console.log("Model Data:", oUpdateModel.getData()); // Debugging

            var gettingAllRows = gettingInternalTable.getBinding().aKeys;
            var oSelIndices = gettingInternalTable.getSelectedIndices();
            if (oSelIndices.length === 0) {
                MessageBox.error("Please Select the Rows");
            } else {
                for (i = 0; i < oSelIndices.length; i++) {
                    var aFreightOrder = this.getView()
                        .getModel()
                        .getObject("/" + gettingAllRows[oSelIndices[i]]);

                    // Check if FreightUnitEditFlag exists; if not, set it manually
                    if (!aFreightOrder.hasOwnProperty("FreightUnitEditFlag")) {
                        aFreightOrder.FreightUnitEditFlag = true; // Default value
                    }

                    if (aFreightOrder.FreightUnitEditFlag === false) {
                        console.log("Freight Order Data:", aFreightOrder); // Debugging
                        console.log("FreightUnitEditFlag:", aFreightOrder.FreightUnitEditFlag);

                        return;
                    }
                    this._ValidationMandatoryFields(aFreightOrder, cValidErr);
                }
                this.openConfirmDialog();
            }
        },

        _ValidationMandatoryFields: function (aFreightOrder, cValidErr) {
            if (aFreightOrder.PkgQuaPcsVal === "") {
                MessageToast.show("Please Enter Confirm Qty");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            };
            if (aFreightOrder.PkgPcsVal === "") {
                MessageToast.show("Please Enter Package Info");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            };
            if (aFreightOrder.PkgLength <= 0) {
                MessageToast.show("Please Enter Valid Length");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            }
            if (aFreightOrder.PkgWidth <= 0) {
                MessageToast.show("Please Enter Valid Width");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            }
            if (aFreightOrder.PkgHeight <= 0) {
                MessageToast.show("Please Enter Valid Height");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            }
            if (aFreightOrder.PkgMeasuom ==='') {
                MessageToast.show("Please Enter Valid Pkg Unit");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            }
            if (aFreightOrder.PkgWeiVal <= 0) {
                MessageToast.show("Please Enter Valid Weight");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            }
            if (aFreightOrder.GroWeiUni ==='') {
                MessageToast.show("Please Enter Valid Weight Unit");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            }
            if (aFreightOrder.PkgId <= 0) {
                MessageToast.show("Please Enter Valid PackageID");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            }
            if (aFreightOrder.PkgPickupDt === "") {
                MessageToast.show("Please Select Pick-Up Date");
                cValidData = true;
                this._oPOTableModel.setProperty("/cValidData", cValidData);
                return;
            }
        },

        // **************************
    });
});