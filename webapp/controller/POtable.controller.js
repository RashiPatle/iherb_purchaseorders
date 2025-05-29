sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller, MessageToast, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("com.iherb.tm.ztmiherbpurchaseorders.controller.POtable", {
        onInit() {
            var oTable = this.byId("idPOTable");
            oTable.attachRowSelectionChange(this._handleRowSelection.bind(this));
            this._oPOTableModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(this._oPOTableModel, "POTableModel");
            this.getView().getModel("POTableModel").setSizeLimit(2000);
            this.onReadOdata();
        },

        onReadOdata: function () {
            var that = this;
            sap.ui.core.BusyIndicator.show();
            var oModel = this.getView().getModel("POTableModel");
            var oDataModel = this.getOwnerComponent().getModel();
            oDataModel.read("/ZC_FuTorItem", {
                urlParameters: {
                    "$top": 2000,
                    "$expand": 'to_Shipper'
                },
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
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
                    if (oData.results) {
                        oData.results.forEach(item => {
                            if (item.PicEarAccTrq) {
                                let utcDate = new Date(item.PicEarAccTrq);
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
                                item.PicEarAccTrq = cstDate;
                            }
                        });
                    }
                    if (oData.results) {
                        oData.results.forEach(item => {
                            if (item.PicLatAccTrq) {
                                let utcDate = new Date(item.PicLatAccTrq);
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
                                item.PicLatAccTrq = cstDate;
                            }
                        });
                    }
                    if (oData.results) {
                        oData.results.forEach(function (item) {
                            if (item.PkgPickupDt && item.PkgTzone) {
                                const timeZoneMap = {
                                    "CST": "America/Chicago",
                                    "PST": "America/Los_Angeles",
                                    "MST": "America/Denver",
                                    "EST": "America/New_York"
                                };

                                const tz = timeZoneMap[item.PkgTzone] || "UTC";
                                // Step 1: Parse UTC string to Date object
                                const utcDate = new Date(item.PkgPickupDt);
                                // Step 2: Format using Intl with given timezone
                                const formatter = new Intl.DateTimeFormat("en-US", {
                                    timeZone: tz,
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: false
                                });

                                const parts = formatter.formatToParts(utcDate);
                                const getPart = (type) => parts.find(p => p.type === type)?.value;

                                const localDateStr = `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}`;
                                // Final Date object in target time zone
                                item.PkgPickupDt = new Date(localDateStr);
                            }
                        });
                    }
                    oModel.setProperty("/list", oData.results);
                    oModel.setSizeLimit(oData.results.length);
                    oModel.setProperty("/OriginalList", oData.results);
                    console.log("PO OData loaded/Response:", oData);
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

            let oLocationModel = this.getView().getModel("LocationModel");
            let aLocations = oLocationModel.getProperty("/");

            if (oSelIndices.length === 0) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.show("Please select a row first.");
                return;
            }

            for (let i = 0; i < oSelIndices.length; i++) {
                var oContext = oTable.getContextByIndex(oSelIndices[i]);
                var oFreightOrder = oContext.getObject();
                var sFO = oFreightOrder.DbKey;

                let selectedDate = oFreightOrder.PkgPickupDt;
                let selectedLocation = oFreightOrder.PkgSrcLoc;
                let timeZone = aLocations.find(loc => loc.Location === selectedLocation)?.Tzone || "UTC";

                let utcDate = this.convertDateToUTC(selectedDate, timeZone);
                console.log(utcDate, "UTC converted date")

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
                    "PkgPickupDt": utcDate, // for backend
                    "PkgReeferComply": oFreightOrder.PkgReeferComply,
                    "PkgSrcLoc": oFreightOrder.PkgSrcLoc
                };
                var path = "/ZC_FuTorItem(guid'" + sFO + "')";
                oUpdateModel.update(path, sPOPayload, {
                    success: function (oData, response) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show("Freight Unit " + oFreightOrder.TorId + " Updated successfully");
                    },
                    error: function (oError) {
                        sap.ui.core.BusyIndicator.hide();
                        var sMessage = "Error creating product";
                        try {
                            var oErr = JSON.parse(oError.responseText);
                            sMessage = oErr.error.message.value;
                        } catch (e) { }
                        MessageToast.show(sMessage, { duration: 10000, width: "25em", });
                    },
                });
            }
            that.onReadOdata();
        },

        convertDateToUTC: function (localDate, timeZone) {
            var offsetMs = this.getTimeZoneOffsetInMs(timeZone); // e.g., CST = -5 * 60 * 60 * 1000
            var utcTimeMs = localDate.getTime() - offsetMs;
            var finalUTCDate = new Date(utcTimeMs);
            var oFormatter = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "yyyy-MM-dd'T'HH:mm:ss'Z'"
            });
            var sFormattedCST = oFormatter.format(finalUTCDate);
            var sConvertedDate = sFormattedCST.toLocaleString();
            console.log("Formatted date string UTC sended in backend:", sConvertedDate);
            return sConvertedDate;
        },

        getTimeZoneOffsetInMs: function (timeZone) {
            debugger
            const offsets = {
                "CST": -5,
                "PST": -7,
                "MST": -7,
                "EST": -4
            };
            return offsets[timeZone] * 60 * 60 * 1000;
        },

        onFilterSelect: function (oEvent) {
            var oTable = this.byId("idPOTable");
            var oBinding = oTable.getBinding("rows");
            var sKey = oEvent.getParameter("key"),
                aFilters = [];
            oBinding.filter([]);

            if (sKey === 'Editable') {
                aFilters.push(new Filter("ReadOnly", "EQ", "X"));
            } else if (sKey === 'non-Editable') {
                aFilters.push(new Filter("ReadOnly", "EQ", ""));
            }
            if (oBinding) {
                oBinding.filter(aFilters);
                oBinding.refresh(true);
                setTimeout(() => {
                    var iIconTabFilterCount = oBinding.getLength();
                    this.getView().byId("_IDGenTitle1").setText("Purchase Order (" + iIconTabFilterCount + ")");
                }, 100);
            } else {
                console.error("Table binding is null. Ensure correct model binding.");
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
            var sDate = this.byId("_IDGenDatePicker").getDateValue();
            var aFilters = [];
            if (oMultiInput1) {
                var aTokens1 = oMultiInput1.getTokens();
                if (aTokens1.length > 0) {
                    var aProductFilters = [];

                    aTokens1.forEach(function (oToken) {
                        var oCustomData = oToken.data(); // get the data object
                        var sKey = oCustomData?.rangeKey || "BaseBtdId"; // default fallback
                        var oRange = oToken.data("range");

                        if (oRange) {
                            var sOperation = oRange.operation;
                            var sValue1 = oRange.value1;
                            var sValue2 = oRange.value2;

                            switch (sOperation) {
                                case "EQ":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.EQ, sValue1));
                                    break;
                                case "Contains":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.Contains, sValue1));
                                    break;
                                case "BT":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.BT, sValue1, sValue2));
                                    break;
                                case "StartsWith":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.StartsWith, sValue1));
                                    break;
                                case "EndsWith":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.EndsWith, sValue1));
                                    break;
                                case "LT":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.LT, sValue1));
                                    break;
                                case "LE":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.LE, sValue1));
                                    break;
                                case "GT":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.GT, sValue1));
                                    break;
                                case "GE":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.GE, sValue1));
                                    break;
                                case "NE":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.NE, sValue1));
                                    break;
                                case "Empty":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.EQ, ""));
                                    break;
                                case "NotEmpty":
                                    aProductFilters.push(new Filter(sKey, FilterOperator.NE, ""));
                                    break;
                                default:
                                    console.warn("Unsupported operation:", sOperation);
                            }
                        } else {
                            var sText = oToken.getText().replace(/\*/g, "");
                            aProductFilters.push(new Filter(sKey, FilterOperator.EQ, sText));
                        }
                    });
                    var oFinalFilter = new sap.ui.model.Filter(aProductFilters, false);
                    aFilters.push(oFinalFilter);
                }
            } else {
                console.log("MultiInput1 is null")
            }

            if (oMultiInput2) {
                var aTokens2 = oMultiInput2.getTokens();
                if (aTokens2.length > 0) {
                    var aPackageFilter = [];

                    aTokens2.forEach(function (oToken) {
                        var oCustomData = oToken.data(); // get the data object
                        var sKey = oCustomData?.rangeKey || "PkgId"; // default fallback
                        var oRange = oToken.data("range");

                        if (oRange) {
                            var sOperation = oRange.operation;
                            var sValue1 = oRange.value1;
                            var sValue2 = oRange.value2;

                            switch (sOperation) {
                                case "EQ":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.EQ, sValue1));
                                    break;
                                case "Contains":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.Contains, sValue1));
                                    break;
                                case "BT":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.BT, sValue1, sValue2));
                                    break;
                                case "StartsWith":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.StartsWith, sValue1));
                                    break;
                                case "EndsWith":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.EndsWith, sValue1));
                                    break;
                                case "LT":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.LT, sValue1));
                                    break;
                                case "LE":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.LE, sValue1));
                                    break;
                                case "GT":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.GT, sValue1));
                                    break;
                                case "GE":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.GE, sValue1));
                                    break;
                                case "NE":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.NE, sValue1));
                                    break;
                                case "Empty":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.EQ, ""));
                                    break;
                                case "NotEmpty":
                                    aPackageFilter.push(new Filter(sKey, FilterOperator.NE, ""));
                                    break;
                                default:
                                    console.warn("Unsupported operation:", sOperation);
                            }
                        } else {
                            var sText = oToken.getText().replace(/\*/g, "");
                            aPackageFilter.push(new Filter(sKey, FilterOperator.EQ, sText));
                        }
                    });
                    var oFinalFilter = new sap.ui.model.Filter(aPackageFilter, false);
                    aFilters.push(oFinalFilter);
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

            debugger
            if (sDate) {
                var sISOString = sDate.toISOString();
                aFilters.push(new sap.ui.model.Filter("PkgPickupDt", sap.ui.model.FilterOperator.EQ, sISOString));
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
    });
});