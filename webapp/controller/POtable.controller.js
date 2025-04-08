sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/ui/core/date/UI5Date",
    "sap/ui/core/format/DateFormat",
    'sap/ui/model/type/DateTime',
], (Controller, MessageToast, Filter, FilterOperator, DateFormat, TypeDateTime) => {
    "use strict";

    return Controller.extend("com.iherb.tm.ztmiherbpurchaseorders.controller.POtable", {
        onInit() {
            var oTable = this.byId("idPOTable");
            oTable.attachRowSelectionChange(this._handleRowSelection.bind(this));
            this._oPOTableModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(this._oPOTableModel, "POTableModel");
            this.getView().getModel("POTableModel").setSizeLimit(500);
            this.onReadOdata();
        },

        onReadOdata: function () {
            var that = this;
            sap.ui.core.BusyIndicator.show();
            var oModel = this.getView().getModel("POTableModel");
            var oDataModel = this.getOwnerComponent().getModel();
            oDataModel.read("/ZC_FuTorItem", {
                urlParameters: {
                    "$top": 500,
                    "$expand": 'to_Shipper'
                },
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    if (oData.results) {
                        oData.results.forEach(item => {
                            if (item.PickupDt) {
                                let utcDate = new Date(item.PickupDt);
                                // Convert UTC to CST in 24-hour format
                                let cstDate = utcDate.toLocaleString("en-US", {
                                    timeZone: "America/Chicago",
                                    hour12: false,
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit"
                                }).replace(",", "");
                                item.PickupDtCST = cstDate;
                            }
                        });
                    }
                    if (oData.results) {
                        oData.results.forEach(item => {
                            if (item.DeliveryDt) {
                                let utcDate = new Date(item.DeliveryDt);
                                // Convert UTC to PST in 24-hour format
                                let pstDate = utcDate.toLocaleString("en-US", {
                                    timeZone: "America/Los_Angeles",
                                    hour12: false,
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit"
                                }).replace(",", "");
                                item.DeliveryDtPST = pstDate;
                            }
                        });
                    }
                    oModel.setProperty("/list", oData.results);
                    oModel.setSizeLimit(oData.results.length);
                    oModel.setProperty("/OriginalList", oData.results);
                    console.log("PO OData loaded/Response:", oData);
                    console.log("Updated PO Data with CST Date:", oData);
                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    console.log("PO data not loaded", oError);
                }.bind(this),
            });
            oDataModel.read("/ZI_PARTNER_LOC", {
                success: function (oData) {
                    var oLocationModel = new sap.ui.model.json.JSONModel(oData.results);
                    that.getView().setModel(oLocationModel, "LocationModel");
                },
                error: function (oError) {
                    console.error("Error fetching locations:", oError);
                }
            });
        },

        _handleRowSelection: function (oEvent) {
            var oTable = this.byId("idPOTable");
            let selectedIndex = oEvent.getParameter("rowIndex");

            if (selectedIndex >= 0) {
                let oRowContext = oTable.getContextByIndex(selectedIndex);
                let oRowData = oRowContext ? oRowContext.getObject() : null;

                if (oRowData && oRowData.ReadOnly === "X") {
                    MessageToast.show("This row has been updated and cannot be selected again.");
                    oTable.setSelectionInterval(-1, -1); // Clear selection immediately
                }
            }
        },

        onClearFilters: function () {
            this.byId("multipleConditions1").removeAllTokens();
            this.byId("multipleConditions2").removeAllTokens();
            this.byId("_IDGenDatePicker").setDateValue(null);
            this.byId("_IDGenMultiComboBox").setSelectedKeys([]);
            var oTable = this.getView().byId("idPOTable");
            var oBinding = oTable.getBinding("rows");
            if (oBinding) {
                oBinding.filter([]);
            }
            var oModel = this.getView().getModel("POTableModel");
            var aOriginalList = oModel.getProperty("/OriginalList");
            if (aOriginalList) {
                oModel.setProperty("/list", aOriginalList);
                this.byId("_IDGenTitle1").setText("Purchase Order (" + aOriginalList.length + ")");
            }

        },

        onRefresh: function () {
            var that = this;
            that.onReadOdata();
        },

        onSubmitPress: function () {
            sap.ui.core.BusyIndicator.show();
            let that = this;
            let oUpdateModel = this.getView().getModel();
            var oTable = this.byId("idPOTable");
            let gettingAllRows = oTable.getBinding().aIndices;
            let oSelIndices = oTable.getSelectedIndices();

            if (oSelIndices.length === 0) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.show("Please select a row first.");
                return;
            } else {
                for (let i = 0; i < oSelIndices.length; i++) {
                    var oContext = oTable.getContextByIndex(oSelIndices[i]);
                    var oFreightOrder = oContext.getObject();
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
                        "PkgPickupDt": that.convertDateUTC(oFreightOrder.PkgPickupDt), // Updated value
                        "PkgReeferComply": oFreightOrder.PkgReeferComply,
                        "PkgSrcLoc": oFreightOrder.PkgSrcLoc
                    };
                    var path = "/ZC_FuTorItem(guid'" + sFO + "')";
                    oUpdateModel.update(path, sPOPayload, {
                        success: function (oData, response) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(
                                "Freight Unit " + oFreightOrder.TorId + " Updated successfully"
                            );
                            that.onReadOdata();
                            // that.clearSelect();
                        },
                        error: function (oError) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(
                                "Error " + oFreightOrder.TorId + "Update request failed"
                            );
                        },
                    });
                }
            }
        },

        clearSelect: function (oTable) {
            var oTable = this.byId("idPOTable");
            var oData = this.getView().getModel().getData(isEdit); // Get backend data
            if (oData.ReadOnly === "X") {
                oTable.setSelectionMode(sap.ui.table.SelectionMode.None); // Disable selection
            } else {
                oTable.setSelectionMode(sap.ui.table.SelectionMode.MultiToggle); // Enable selection
            }
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

        onPackItmPress: function () {
            var oTable = this.byId("idPOTable");
            let gettingAllRows = oTable.getBinding().aIndices;
            let oSelIndices = oTable.getSelectedIndices();
            var oModel = this.getView().getModel("POTableModel");

            var aFreightOrder = oModel.getProperty("/list/" + gettingAllRows[oSelIndices[0]]); // Fetch the selected row data
            if (oSelIndices.length === 0) {
                sap.m.MessageToast.show("Please select a row first.");
                return;
            };
            if (!this.oDialogPackItem) {
                this.oDialogPackItem = sap.ui.xmlfragment(
                    "com.iherb.tm.ztmiherbpurchaseorders.fragment.packItem",
                    this
                );
                var oPath = "/ZC_FuTorItem(" + "guid" + "'" + aFreightOrder.DbKey + "')/to_Shipper";
                this._setPackLoadData(oPath, aFreightOrder);
                this.getView().addDependent(this.oDialogPackItem);
            }
            this.oDialogPackItem.open();
        },

        _setPackLoadData: function (oPath, aFreightOrder) {
            var oPackageType = sap.ui.getCore().byId("PackType");
            var oPackageTypeSelectTemplate = new sap.ui.core.ListItem({ key: "{UnitOfMeasure}", text: "{UnitOfMeasure}", additionalText: "{UnitOfMeasureLongName}" });
            oPackageType.bindItems({
                path: "/ZI_PkgUnitOfMeasureVH",
                template: oPackageTypeSelectTemplate
            });
            var oDimUnit = sap.ui.getCore().byId("inputDimUnitId");
            var oDimUnitSelectTemplate = new sap.ui.core.ListItem({ key: "{UnitOfMeasure}", text: "{UnitOfMeasure}", additionalText: "{UnitOfMeasureLongName}" });
            oDimUnit.bindItems({
                path: "/ZI_DimUnitOfMeasureVH",
                template: oDimUnitSelectTemplate
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
            sap.ui.getCore().byId("inputWeight").setValue(aFreightOrder.PkgWeiVal);
            sap.ui.getCore().byId("InputWeightUnit").setValue(aFreightOrder.PkgWeiUni);
            sap.ui.getCore().byId("pkgId").setValue(aFreightOrder.PkgId);
            sap.ui.getCore().byId("inputDate").setValue(aFreightOrder.PkgPickupDt);
        },

        onPressCancelPack: function () {
            this.oDialogPackItem.close();
        },

        onPressPackItem: function () {
            var oTable = this.byId("idPOTable");
            let gettingAllRows = oTable.getBinding().aIndices;
            let oSelIndices = oTable.getSelectedIndices();
            let oModel = this.getView().getModel();
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
            for (let i = 0; i < oSelIndices.length; i++) {
                var oContext = oTable.getContextByIndex(oSelIndices[i]);
                var oData = oContext.getObject();
                oData.PkgPcsVal = PackageDetails.PackQty;
                oData.PkgPcsUni = PackageDetails.PackTyp;
                oData.PkgLength = PackageDetails.Length;
                oData.PkgWidth = PackageDetails.Width;
                oData.PkgHeight = PackageDetails.Height;
                oData.PkgMeasuom = PackageDetails.DimUOM;
                oData.PkgWeiVal = PackageDetails.Weight;
                oData.PkgWeiUni = PackageDetails.WeightUOM;
                oData.PkgId = PackageDetails.PkgID;
                oData.PkgSrcLoc = PackageDetails.LocationSrc;
                oData.PkgPickupDt = PackageDetails.PickUpDate;
                this._oPOTableModel.setProperty("/ZC_FuTorItem(" + "'" + oData.DbKey + "')", oData)
            }
            this.oDialogPackItem.close();
        },

        onSearch: function (oEvent) {
            var oTable = this.getView().byId("idPOTable");
            var oMultiInput1 = this.byId("multipleConditions1");
            var oMultiInput2 = this.byId("multipleConditions2");
            var aFilters = [];
            if (oMultiInput1) {
                var aTokens1 = oMultiInput1.getTokens();
                if (aTokens1.length > 0) {
                    var aProductIDs = aTokens1.map(token => token.getText().replace(/\*/g, ""));
                    console.log("Extracted Product IDs:", aProductIDs);
                    var aProductFilters = aProductIDs.map(id => new Filter("BaseBtdId", FilterOperator.EQ, id));
                    var oFinalFilter = new sap.ui.model.Filter(aProductFilters, false);
                    aFilters.push(oFinalFilter);
                }
            } else {
                console.log("MultiInput1 is null")
            }

            if (oMultiInput2) {
                var aTokens2 = oMultiInput2.getTokens();
                if (aTokens2.length > 0) {
                    var aPackageIDs = aTokens2.map(token => token.getText().replace(/\*/g, ""));
                    var aPackageFilter = aPackageIDs.map(id => new Filter("PkgId", FilterOperator.EQ, id));
                    var oFinalPackageFilter = new sap.ui.model.Filter(aPackageFilter, false);
                    aFilters.push(oFinalPackageFilter);
                }
            } else {
                console.error("MultiInput2 is null");
            }

            var oMultiComboBox = this.getView().byId("_IDGenMultiComboBox");
            var aSelectedItems = oMultiComboBox ? oMultiComboBox.getSelectedItems() : [];
            if (aSelectedItems.length > 0) {
                var aLocations = aSelectedItems.map(item => item.getKey());
                var oFilter3 = new sap.ui.model.Filter({
                    filters: aLocations.map(loc => new sap.ui.model.Filter("PkgSrcLoc", sap.ui.model.FilterOperator.EQ, loc)),
                    and: false
                });
                aFilters.push(oFilter3);
            }

            var sDate = this.byId("_IDGenDatePicker").getDateValue();
            if (sDate) {
                aFilters.push(new sap.ui.model.Filter("PkgPickupDt", sap.ui.model.FilterOperator.EQ, sDate));
            }

            var oBinding = oTable.getBinding("rows");
            if (oBinding) {
                oBinding.filter(aFilters);
                oBinding.refresh(true);
                setTimeout(() => {
                    var iFilteredCount = oBinding.getLength();
                    this.getView().byId("_IDGenTitle1").setText("Purchase Order (" + iFilteredCount + ")");
                }, 100);
            } else {
                console.error("Table binding is null. Ensure correct model binding.");
            }
        },

        onMultipleConditionsVHRequested: function (oEvent) {
            var oSource = oEvent.getSource(); // Get the triggering MultiInput
            this._oMultipleConditionsInput = oSource; // Store reference for later use
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            // Determine the label and key based on the clicked field
            var sLabel, sKey;
            if (oSource.getId().includes("multipleConditions1")) {
                sLabel = oResourceBundle.getText("PurchaseOrderLabel");
                sKey = "BaseBtdId";
            } else if (oSource.getId().includes("multipleConditions2")) {
                sLabel = oResourceBundle.getText("packageid");
                sKey = "PkgId";
            }
            this.loadFragment({
                name: "com.iherb.tm.ztmiherbpurchaseorders.fragment.ValueHelpDialogMultipleConditions"
            }).then(function (oMultipleConditionsDialog) {
                this._oMultipleConditionsDialog = oMultipleConditionsDialog;
                this.getView().addDependent(oMultipleConditionsDialog);
                if (oMultipleConditionsDialog) {
                    oMultipleConditionsDialog.setRangeKeyFields([
                        {
                            label: sLabel,
                            key: sKey,
                            type: "string",
                        }
                    ]);
                    oMultipleConditionsDialog.setTokens(oSource.getTokens());
                    oMultipleConditionsDialog.open();
                } else {
                    console.error("ValueHelpDialog is null");
                }
            }.bind(this));
        },

        onMultipleConditionsValueHelpOkPress: function (oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            if (this._oMultipleConditionsInput) {
                this._oMultipleConditionsInput.removeAllTokens(); // Clear old tokens
                this._oMultipleConditionsInput.setTokens(aTokens); // Set new tokens
            } else {
                console.error("Error: _oMultipleConditionsInput is null");
            }
            this._oMultipleConditionsDialog.close();
        },
        onMultipleConditionsCancelPress: function () {
            this._oMultipleConditionsDialog.close();
        },
        onMultipleConditionsAfterClose: function () {
            this._oMultipleConditionsDialog.destroy();
        },
        convertDateUTC: function (sDate) {
            debugger
            var iYear = sDate.getUTCFullYear();
            var iMonth = sDate.getUTCMonth();
            var iDay = sDate.getUTCDate();
            var iHour = sDate.getUTCHours();
            var iMinute = sDate.getUTCMinutes();
            var dDate = new Date(Date.UTC(iYear, iMonth, iDay, iHour, iMinute));
            return dDate;
        },

        onLocationChange: function (oEvent) {
            debugger
            var that = this;
            var oDateTimePicker = this.getView().byId("pickUpDateId");
            var oTableModel = this.getView().getModel("POTableModel");
            var oLocationModel = this.getView().getModel("LocationModel");
            var oTable = this.getView().byId("idPOTable");
            var aSelectedIndices = oTable.getSelectedIndices();
            if (aSelectedIndices.length === 0) {
                sap.m.MessageToast.show("Please select a row first.");
                this.onRefresh();
                return;
            }
            var oContext = oTable.getContextByIndex(aSelectedIndices[0]);  // Get selected row context
            var oSelectedRow = oContext.getObject();
            var sSelectedDate = oSelectedRow.PkgPickupDt;    // Get PkgPickupDt (Local Browser Time)
            if (!sSelectedDate) {
                sap.m.MessageToast.show("No date found in selected row.");
                return;
            }
            var selectedDate = new Date(sSelectedDate);  // Convert string to Date object
            if (isNaN(selectedDate)) {
                console.error("Invalid date:", sSelectedDate);
                return;
            }
            var dUTCDate = this.convertToUTC(selectedDate);  // Convert to UTC
            var sSelectedLocationKey = oEvent.getSource().getSelectedKey();      // Get selected location's timezone
            var aLocations = oLocationModel.getProperty("/");
            var oSelectedLocation = aLocations.find(loc => loc.Location === sSelectedLocationKey);
            if (!oSelectedLocation) {
                console.error("Location not found.");
                return;
            }
            var sTimeZone = oSelectedLocation.Tzone; // Get time zone of selected location
            var dConvertedDate = that.convertToTimeZone(dUTCDate, sTimeZone);   // Convert UTC to selected location timezone
            // oDateTimePicker.setDateValue(dConvertedDate);
            oTableModel.setProperty(oContext.getPath() + "/PkgPickupDt", dConvertedDate);    // Update the selected row's PkgPickupDt in the model
            console.log("Updated DateTimePicker with:", dConvertedDate, "Timezone:", sTimeZone);
        },

        convertToTimeZone: function (oDate, sTargetTimeZone) {
            debugger
            // Convert string to Date object
            if (typeof oDate === "string") {
                oDate = new Date(oDate);
            }
            if (!oDate || !(oDate instanceof Date) || isNaN(oDate.getTime())) {
                console.error("Invalid or missing date:", oDate);
                return null;
            }
            if (!sTargetTimeZone) {
                console.error("Missing or invalid timezone:", sTargetTimeZone);
                return null;
            }
            // Create formatter once
            if (!this.oDateTimeWithTimezoneFormat) {
                this.oDateTimeWithTimezoneFormat = sap.ui.core.format.DateFormat.getDateTimeWithTimezoneInstance({
                    pattern: "yyyy-MM-dd HH:mm:ss",
                    showTimezone: true
                });
            }
            // Format date with timezone
            try {
                var sFormattedDate = this.oDateTimeWithTimezoneFormat.format(oDate, sTargetTimeZone);
                console.log("Formatted Date in " + sTargetTimeZone + ": ", sFormattedDate);
                var dLocalDate = this.convertFormattedStringToLocalDate(sFormattedDate);
                return dLocalDate;
            } catch (error) {
                console.error("Date formatting failed:", error);
                return null;
            }
        },

        convertFormattedStringToLocalDate: function (sFormattedDate) {
            debugger;
            if (!sFormattedDate) {
                console.error("Missing input date string");
                return null;
            }
            // Step 1: Parse the "yyyy-MM-dd HH:mm:ss" formatted string
            var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "yyyy-MM-dd HH:mm:ss"
            });
            var oParsedDate = oDateFormat.parse(sFormattedDate);

            // Step 2: Return the parsed JavaScript Date 
            if (oParsedDate instanceof Date && !isNaN(oParsedDate)) {
                console.log("Converted to JS Date:", oParsedDate);
                return oParsedDate;
            } else {
                console.error("Invalid parsed date:", oParsedDate);
                return null;
            }
        },

        convertToUTC: function (date, selectedDate) {
            debugger
            // Create a DateFormat instance with UTC enabled
            var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "yyyy-MM-dd'T'HH:mm:ss'Z'",
                UTC: true
            });
            // Format the date as a UTC string
            var utcDateString = oDateFormat.format(date);
            return utcDateString;

        }

        // **************************END
    });
});