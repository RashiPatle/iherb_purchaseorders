sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller, MessageBox, MessageToast, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("com.iherb.tm.ztmiherbpurchaseorders.controller.POtable", {
        onInit() {
            this._oCustomSelect = this.byId("_IDGenSelect");
            this._oPOTableModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(this._oPOTableModel, "POTableModel");

            this._oPkgModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(this._oPkgModel, "PkgModel");

            this._oPartnerModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(this._oPartnerModel, "PartnerModel");
            // this.onReadOdata();
            // this.onReadPackOdata();
        },

        onReadOdata: function () {
            var that = this;
            var oDataModel = this.getOwnerComponent().getModel();
            oDataModel.read("/ZC_FuTorItem", {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    this._oPOTableModel.setData(oData);
                    console.log("PO OData loaded/Response:", oData);
                    // Store the fetched data in POTableModel
                    that._oPOTableModel.setData({ FreightOrders: oData.results });
                }.bind(this),
                error: function (oerror) {
                    sap.ui.core.BusyIndicator.hide();
                    console.log("PO data not loaded", oerror);
                }.bind(this),
            });
        },

        onReadPackOdata: function () {
            var that = this;
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

        onSubmitPress: function () {
            var i;
            var that = this;
            var cValidErr = false;
            this._oPOTableModel.setProperty("/cValidData", cValidErr);

            let gettingInternalTable = this.byId("smartTable").getTable();
            console.log("Smart Table:", gettingInternalTable); // Debugging

            var gettingAllRows = gettingInternalTable.getBinding().aKeys;
            var oSelIndices = gettingInternalTable.getSelectedIndices();
            if (oSelIndices.length === 0) {
                MessageBox.error("Please Select the Rows");
            } else {
                for (i = 0; i < oSelIndices.length; i++) {
                    var aFreightOrder = this.getView().getModel().getObject("/" + gettingAllRows[oSelIndices[i]]);
                    // this._ValidationMandatoryFields(aFreightOrder);
                }
                this.openConfirmDialog();
            }
        },

        onPressConfirmBox: function () {
            var i;
            var that = this;
            this.onPressCancel();

            let oUpdateModel = this.getView().getModel();
            let oTable = this.byId("smartTable").getTable(); // Get sap.ui.table.Table
            let gettingAllRows = oTable.getBinding().aKeys;
            let oSelIndices = oTable.getSelectedIndices(); // Get selected rows
            if(oSelIndices === 1){
                for (i = 0; i < oSelIndices.length; i++) {
                    var oFreightOrder = this.getView().getModel().getObject("/" + gettingAllRows[oSelIndices[i]]);
                    var sFO = oFreightOrder.DbKey;
                    var sPOPayload = {
                        "DbKey": sFO,
                        "TorId": oFreightOrder.TorId,
                        "PkgQuaPcsVal": oFreightOrder.PkgQuaPcsVal,
                        "PkgQuaPcsUni": oFreightOrder.PkgQuaPcsUni,
                        "PkgPcsVal": oFreightOrder.PkgPcsVal,
                        "PkgPcsUni": oFreightOrder.PkgPcsUni,
                        "PkgLength": oFreightOrder.PkgLength,
                        "PkgWidth": oFreightOrder.PkgWidth,
                        "PkgHeight": oFreightOrder.PkgHeight,
                        "PkgMeasuom": oFreightOrder.PkgMeasuom,
                        "PkgWeiVal": oFreightOrder.PkgWeiVal,
                        "PkgWeiUni": oFreightOrder.PkgWeiUni,
                        "PkgId": oFreightOrder.PkgId,
                        "PkgPickupDt": this.convertDateUTC(oFreightOrder.PkgPickupDt),
                        "PkgReeferComply": Boolean(oFreightOrder.PkgReeferComply),
                        "PkgSrcLoc": oFreightOrder.PkgSrcLoc
                    };
                    var path = "/ZC_FuTorItem(guid'" + sFO + "')";
                    oUpdateModel.update(path, sPOPayload, {
                        success: function (oData, response) {
                            MessageToast.show(
                                "Freight Unit " + oFreightOrder.TorId + " Updated successfully"
                            );
                            oUpdateModel.refresh(true);
                            // that.setReadFlag(oTable,oData);
                        },
                        error: function (oError) {
                            MessageToast.show(
                                "Error " + oFreightOrder.TorId + "Update request failed"
                            );
                        },
                    });
                }
            }else{
                
            }
            oTable.removeSelectionInterval(oSelIndices[i], oSelIndices[i]);
        },

        setReadFlag: function (oTable, oData) {
            let oModel = this.getView().getModel();
            let oSelectedIndices = oTable.getSelectedIndices(); // Get selected row indices

            if (oSelectedIndices.length === 0) return; // No row selected

            oSelectedIndices.forEach(index => {
                let oContext = oTable.getContextByIndex(index);
                if (!oContext) return;

                let rowData = oContext.getObject();
                if (rowData.ReadOnly === "X") {
                    oTable.getRows()[index].addStyleClass("readOnlyRow"); // Apply CSS class
                }
            });
            oTable.removeSelectionInterval(oSelIndices[i], oSelIndices[i]);
            oModel.refresh(true); // Refresh UI to reflect changes
        },

        // setReadFlag: function (oTable) {
        //     let oModel = this.getView().getModel();
        //     let aData = oModel.getProperty("/"); // Get all table data
        //     // Update each row's ReadOnly property and add a class dynamically
        //     aData.forEach(function (rowData) {
        //         if (rowData.ReadOnly === "X") {
        //             rowData.RowClass = "readOnlyRow"; // Add a flag in the model
        //         } else {
        //             rowData.RowClass = ""; // Remove class if not ReadOnly
        //         }
        //     });
        //     oModel.setProperty("/", aData); // Update the model
        //     oModel.refresh(true); // Refresh the model to reflect changes
        //     oTable.removeSelectionInterval(oSelIndices[i], oSelIndices[i]);
        // },

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

        onPackItmPress: function () {
            var i;
            let oTable = this.byId("smartTable").getTable();
            var oModel = this.getView().getModel();
            let gettingAllRows = oTable.getBinding().aKeys;
            let oSelIndices = oTable.getSelectedIndices();
            var aFreightOrder = oModel.getObject("/" + gettingAllRows[oSelIndices[0]]);

            if (oSelIndices.length === 0) {
                sap.m.MessageToast.show("Please select a row first.");
                return;
            };

            if (!this.oDialogPackItem) {
                this.oDialogPackItem = sap.ui.xmlfragment(
                    "com.iherb.tm.ztmiherbpurchaseorders.fragment.packItem",
                    this
                );
                let oPath = "/ZC_FuTorItem(" + "guid" + "'" + aFreightOrder.DbKey + "')/to_Shipper";
                this._setPackLoadData(oPath, aFreightOrder);
                this.getView().addDependent(this.oDialogPackItem);
            }
            this.oDialogPackItem.open();
        },


        onPressCancelPack: function () {
            this.oDialogPackItem.close();
        },

        _setPackLoadData: function (oPath, aFreightOrder) {
            var oPackageType = sap.ui.getCore().byId("PackType");
            var oPackageTypeSelectTemplate = new sap.ui.core.ListItem({ key: "{PkgUni}", text: "{PkgUni}", additionalText: "{Descr}" });
            oPackageType.bindItems({
                path: "/ZI_PKG_UNIT",
                template: oPackageTypeSelectTemplate
            });
            var oLocation = sap.ui.getCore().byId("inputLoc");
            var oLocationItemSelectTemplate = new sap.ui.core.ListItem({ key: "{Location}", text: "{LocDescr}" });
            oLocation.bindItems({
                path: oPath,
                template: oLocationItemSelectTemplate
            });
            sap.ui.getCore().byId("PackQty").setValue(aFreightOrder.PkgPcsVal);
            sap.ui.getCore().byId("inputLength").setValue(aFreightOrder.PkgLength);
            sap.ui.getCore().byId("inputWidth").setValue(aFreightOrder.PkgWidth);
            sap.ui.getCore().byId("inputHeight").setValue(aFreightOrder.PkgHeight);
            sap.ui.getCore().byId("inputDimUnitId").setValue(aFreightOrder.PkgMeasuom);
            sap.ui.getCore().byId("inputWeight").setValue(aFreightOrder.PkgWeiVal);
            sap.ui.getCore().byId("InputWeightUnit").setValue(aFreightOrder.PkgWeiUni);
            sap.ui.getCore().byId("pkgId").setValue(aFreightOrder.PkgId);
            sap.ui.getCore().byId("inputDate").setValue(aFreightOrder.PkgPickupDt);

            // var oPackageDetails = {
            //     PackQty: sap.ui.getCore().byId("PackQty").getValue(),
            //     PackTyp: sap.ui.getCore().byId("PackType").getValue(),
            //     Length: sap.ui.getCore().byId("inputLength").getValue(),
            //     Width: sap.ui.getCore().byId("inputWidth").getValue(),
            //     Height: sap.ui.getCore().byId("inputHeight").getValue(),
            //     DimUOM: sap.ui.getCore().byId("inputDimUnitId").getValue(),
            //     Weight: sap.ui.getCore().byId("inputWeight").getValue(),
            //     WeightUOM: sap.ui.getCore().byId("InputWeightUnit").getValue(),
            //     PkgID: sap.ui.getCore().byId("pkgId").getValue(),
            //     PickUpDate: sap.ui.getCore().byId("inputDate").getDateValue(),
            //     LocationSrc: sap.ui.getCore().byId("inputLoc").getSelectedKey(),
            // };
            // console.log(oPackageDetails); // Debugging
        },

        onPressPackItem: function () {
            let oTable = this.byId("smartTable").getTable();
            let gettingAllRows = oTable.getBinding().aKeys;
            let oSelIndices = oTable.getSelectedIndices();
            let oModel = this.getView().getModel();

            // this.oPackageModel = new sap.ui.model.json.JSONModel();
            // this.getView().setModel(this.oPackageModel, "PackageModel");

            var PackageDetails = {
                PackQty: sap.ui.getCore().byId("PackQty").getValue(),
                PackTyp: sap.ui.getCore().byId("PackType").getValue(),
                Length: sap.ui.getCore().byId("inputLength").getValue(),
                Width: sap.ui.getCore().byId("inputWidth").getValue(),
                Height: sap.ui.getCore().byId("inputHeight").getValue(),
                DimUOM: sap.ui.getCore().byId("inputDimUnitId").getValue(),
                Weight: sap.ui.getCore().byId("inputWeight").getValue(),
                WeightUOM: sap.ui.getCore().byId("InputWeightUnit").getValue(),
                PkgID: sap.ui.getCore().byId("pkgId").getValue(),
                PickUpDate: sap.ui.getCore().byId("inputDate").getDateValue(),
                LocationSrc: sap.ui.getCore().byId("inputLoc").getSelectedKey(),
            };
            // this.oPackageModel.setData(PackageDetails);

            for (let i = 0; i < oSelIndices.length; i++) {
                var oFreightOrder = oModel.getObject("/" + gettingAllRows[oSelIndices[i]]);
                oFreightOrder.PkgPcsVal = PackageDetails.PackQty;
                oFreightOrder.PkgUni = PackageDetails.PackTyp;
                oFreightOrder.PkgLength = PackageDetails.Length;
                oFreightOrder.PkgWidth = PackageDetails.Width;
                oFreightOrder.PkgHeight = PackageDetails.Height;
                oFreightOrder.PkgMeasuom = PackageDetails.DimUOM;
                oFreightOrder.PkgWeiVal = PackageDetails.Weight;
                oFreightOrder.PkgWeiUni = PackageDetails.WeightUOM;
                oFreightOrder.PkgId = PackageDetails.PkgID;
                oFreightOrder.PkgSrcLoc = PackageDetails.LocationSrc;
                oFreightOrder.PkgPickupDt = PackageDetails.PickUpDate;
                // oModel.setProperty("/ZC_FuTorItem(" + "'" + oFreightOrder.DbKey + "')", oFreightOrder)

                var aPath = "/ZC_FuTorItem('" + oFreightOrder.DbKey + "')/oFreightOrder";
                oModel.setProperty(aPath, PackageDetails);
            }

            // oModel.refresh(true);
            // Close the dialog
            this.oDialogPackItem.close();

        },


        // updatePackItem: function () {
        //     var i;
        //     var that = this;
        //     var oUpdateModel = this.getView().getModel();
        //     oUpdateModel.sDefaultUpdateMethod = "MERGE";

        //     let gettingInternalTable = this.byId("smartTable").getTable();
        //     let gettingAllRows = gettingInternalTable.getBinding().aKeys;
        //     let oSelIndices = gettingInternalTable.getSelectedIndices();

        //     var sPackQty = sap.ui.getCore().byId("PackQty").getValue();
        //     var sPackTyp = sap.ui.getCore().byId("PackType").getValue();
        //     var sLength = sap.ui.getCore().byId("inputLength").getValue();
        //     var sWidth = sap.ui.getCore().byId("inputWidth").getValue();
        //     var sHeight = sap.ui.getCore().byId("inputHeight").getValue();
        //     var sDimUOM = sap.ui.getCore().byId("inputDimUnitId").getValue();
        //     var sWeight = sap.ui.getCore().byId("inputWeight").getValue();
        //     var sWeightUOM = sap.ui.getCore().byId("InputWeightUnit").getValue();
        //     var sPkgID = sap.ui.getCore().byId("pkgId").getValue();
        //     var sPickUpDate = sap.ui.getCore().byId("inputDate").getDateValue();

        //     for (i = 0; i < oSelIndices.length; i++) {
        //         var oFreightOrder = this.getView().getModel().getObject("/" + gettingAllRows[oSelIndices[i]]);
        //         var sFO = oFreightOrder.DbKey;
        //         var sPOPayload = {
        //             "DbKey": sFO,
        //             "PkgPcsVal": sPackQty,
        //             "PkgPcsUni": sPackTyp,
        //             "PkgLength": sLength,
        //             "PkgWidth": sWidth,
        //             "PkgHeight": sHeight,
        //             "PkgMeasuom": sDimUOM,
        //             "PkgWeiVal": sWeight,
        //             "GroWeiUni": sWeightUOM,
        //             "PkgId": sPkgID,
        //             "PkgPickupDt": sPickUpDate,
        //         };
        //         var path = "/ZC_FuTorItem(guid'" + sFO + "')";
        //         oUpdateModel.update(path, sPOPayload, {
        //             success: function (oData, response) {
        //                 gettingInternalTable.getModel().refresh(true);
        //                 MessageToast.show("Multiple Update Success");
        //                 that.onPressCancelPack();
        //             },
        //             error: function (oError) {
        //                 gettingInternalTable.getModel().refresh(true);
        //                 MessageBox.error("Multiple Update Fail");
        //             }
        //         });
        //     }
        // },

        convertDateUTC: function (sDate) {
            var iYear = sDate.getUTCFullYear();
            var iMonth = sDate.getUTCMonth();
            var iDay = sDate.getUTCDate();
            var iHour = sDate.getUTCHours();
            var iMinute = sDate.getUTCMinutes();
            var dDate = new Date(Date.UTC(iYear, iMonth, iDay, iHour, iMinute));
            return dDate;
        },

        onRowSelect: function () {
            var gettingInternalTable = this.byId("smartTable").getTable();
            var oSelIndices = gettingInternalTable.getSelectedIndices();
            if (oSelIndices.length <= 1) {
                this.getView().byId("idPacktogether").setVisible(false);
            } else {
                this.getView().byId("idPacktogether").setVisible(true);
            }
        },

        onBeforeRebindTable: function (oEvent) {
            var mBindingParams = oEvent.getParameter("bindingParams");
            var sSelectValue = this._oCustomSelect.getSelectedKey();
            if (sSelectValue) {
                mBindingParams.filters.push(
                    new Filter(
                        "PkgSrcLoc",
                        FilterOperator.EQ,
                        sSelectValue
                    )
                );
            }
        }
        // **************************
    });
});