/// <reference path="..\..\Freezer\Ext\ext-all-dev.js" />

/**
* @class gxui.GridExtension
* Custom render for Grid controls. Wraps Ext.grid.Panel so it can be used from GeneXus.
* Grids are an excellent way of showing large amounts of tabular data on the client side. Essentially a 
* supercharged &lt;table&gt;, GridExtension makes it easy to fetch, sort and filter large amounts of data.
*/
Ext.define('gxui.GridExtension', {
	extend: 'gxui.UserControl',

	onRender: function () {
		var cmConf = this.getColumnsConfig(),
			storeConf = this.getStoreConfig(cmConf.fields),
			smConf = this.getSelModelConfig(),
			viewConf = this.getViewConfig(),
			plugins = this.getPlugins(),
			features = this.getFeatures();

		// create the Grid
		this.m_grid = this.createGridPanel(cmConf, storeConf, smConf, viewConf, plugins, features);

		// D&D listeners:
		if (gx.lang.gxBoolean(this.ownerGrid.defaultDragable)) {
			this.m_DD = Ext.create('gxui.GridExtension.DragDrop', this, {
				DragDropText: this.DragDropText,
				PrimaryButtonOnly: this.PrimaryButtonOnly
			});
		}

		// Add to parent UC container
		if (gx.lang.gxBoolean(this.AddToParentGxUIControl)) {
			this.addToParentContainer(this.m_grid);
		}

		// Correct width when it isn't specified, to behave as standard GX grid.
		gxui.afterShow(this.fixGridWidth, this);
	},

	onRefresh: function () {
		var grid = this.m_grid,
			view = grid.getView();

		// Toggle summary row
		if (gx.lang.gxBoolean(this.Grouping)) {
			var groupingFeature = view.getFeature(this.getUniqueId() + '-grouping');
			if (groupingFeature && groupingFeature.ftype == 'groupingsummary')
				groupingFeature.toggleSummaryRow(gx.lang.gxBoolean(this.ShowGroupingSummary));
		}

		grid.getStore().loadRawData(this.properties);

		this.updatePagingToolbar(grid.getDockedComponent('toolbar'));

		if (gx.lang.gxBoolean(this.gxAllowCollapsing)) {
			if (gx.lang.gxBoolean(this.gxCollapsed)) {
				grid.collapse();
			}
			else {
				grid.expand();
			}
		}

		if (this.Visible != undefined) {
			if (gx.lang.gxBoolean(this.gxVisible) && !grid.isVisible()) {
				grid.show();
			}
			else {
				if (!gx.lang.gxBoolean(this.gxVisible) && grid.isVisible()) {
					grid.hide();
				}
			}
		}

		if (!grid.ownerCt) {
			if (this.gxHeight && grid.getBox().height != this.gxHeight) {
				grid.setHeight(this.gxHeight);
			}

			if (this.gxWidth && grid.getBox().width != this.gxWidth) {
				grid.setWidth(this.gxWidth);
			}
		}

		grid.setTitle(this.Title);
	},

	onDestroy: function () {
		if (this.m_DD) {
			this.m_DD.destroy();
		}
		gxui.GridExtension.superclass.onDestroy.call(this);
	},

	getUnderlyingControl: function () {
		return this.m_grid;
	},

	createGridPanel: function (cmConf, storeConf, smConf, viewConf, plugins, features) {
		this.gxWidth = parseInt(this.gxWidth);
		this.gxHeight = parseInt(this.gxHeight);
		var config = {
			id: this.getUniqueId(),
			features: features,
			plugins: plugins,
			store: storeConf,
			columns: cmConf.columns,
			viewConfig: viewConf,
			selType: smConf.selType,
			selModel: smConf.selModel,
			dockedItems: [],
			//cls: this.gx.CssClass,
			enableColumnHide: gx.lang.gxBoolean(this.EnableColumnHide),
			enableColumnMove: gx.lang.gxBoolean(this.EnableColumnMove),
			enableLocking: gx.lang.gxBoolean(this.EnableColumnLocking),
			collapsible: gx.lang.gxBoolean(this.gxAllowCollapsing),
			collapsed: gx.lang.gxBoolean(this.gxCollapsed),
			header: gx.lang.gxBoolean(this.gxAllowCollapsing),
			height: this.gxHeight ? this.gxHeight : undefined,
			width: this.gxWidth ? this.gxWidth : undefined,
			title: this.Title ? this.Title : undefined,
			autoRender: this.getContainerControl(),
			listeners: this.gridListeners(),
			stateful: gx.lang.gxBoolean(this.Stateful),
			stateId: this.StateId || undefined
		};

		if (gx.lang.gxBoolean(this.UseThemeClasses)) {
			config.cls += ' ' + this.gxCssClass;
		}

		if (this.hasPagingButtons()) {
			config.dockedItems.push(this.getPagingToolbarConfig());
		}

		var grid = Ext.create('Ext.grid.GridPanel', config);

		return grid;
	},

	getPlugins: function () {
		var plugins = [{ ptype: 'autowidthcolumns'}];

		if (this.isEditable()) {
			plugins.push({
				ptype: 'cellediting',
				pluginId: this.getUniqueId() + '-celledit',
				clicksToEdit: 1,
				listeners: {
					'edit': this.afterEditHandler,
					'beforeedit': this.beforeEditHandler,
					scope: this
				}
			});
		}

		return plugins;
	},

	getFeatures: function () {
		var features = [];
		if (gx.lang.gxBoolean(this.Grouping)) {
			features.push({
				id: this.getUniqueId() + '-grouping',
				ftype: gx.lang.gxBoolean(this.ShowGroupingSummary) ? 'groupingsummary' : 'grouping',
				groupHeaderTpl: this.GroupTemplate
			});
		}
		return features;
	},

	getSelModelConfig: function () {
		if (this.isEditable())
			return {
				selType: 'cellmodel'
			};
		else if (this.SelectionModel == 'CheckBoxSelectionModel')
			return {
				selType: 'checkboxmodel',
				selModel: {
					injectCheckbox: 'first',
					mode: 'SINGLE'
				}
			};
		else
			return {
				selType: 'rowmodel',
				selModel: {
					mode: 'SINGLE'
				}
			};
	},

	getViewConfig: function () {
		var viewConf = {
			plugins: [],
			disableSelection: !gx.lang.gxBoolean(this.gxAllowSelection),
			trackOver: gx.lang.gxBoolean(this.gxAllowHovering),
			stripeRows: (this.gxTitleBackstyle == gx.grid.styles.report)
		};

		if (gx.lang.gxBoolean(this.ownerGrid.defaultDragable) && gx.lang.gxBoolean(this.gxAllowSelection))
			viewConf.plugins.push({
				pluginId: this.getUniqueId() + '-dd',
				ptype: 'gridviewdragdrop',
				enableDrop: false,
				ddGroup: this.DragDropGroup || "",
				dragText: this.DragDropText
			});

		return viewConf;
	},

	getColumnsConfig: function () {
		var columns = this.columns;

		var conf = {
			headers: {},
			columns: [],
			fields: []
		};

		Ext.each(this.columns, function (col, i) { this.mapColumn(col, i, conf); }, this);

		delete conf.headers;

		return conf;
	},

	getColumnType: function (col) {
		if (col.gxControl.type == gx.html.controls.types.checkBox)
			return 'boolean';

		switch (col.type) {
			case gx.types.numeric:
				return "float";
			case gx.types.bool:
				return "boolean";
			case gx.types.date:
				return "date";
			case gx.types.dateTime:
				return "date";
			default:
				return "string";
		};
	},

	converter: {
		date: function (v) {
			var gxdate;
			if (typeof v == 'string' || v instanceof Date)
				gxdate = new gx.date.gxdate(v);
			else if (v instanceof gx.date.gxdate)
				gxdate = v
			gxdate.Value.gxdate = gxdate;
			return gxdate.Value;
		},

		checkBox: function (v, record, col) {
			if (typeof v == 'boolean')
				return v;
			if (v == col.gxChecked)
				return true;
			return false;
		}
	},

	mapColumn: function (col, i, conf) {
		var GE = gxui.GridExtension, controlTypes = gx.html.controls.types;

		if (gx.lang.gxBoolean(col.visible)) {
			var colType = this.getColumnType(col),
				converter;

			if (colType == 'date')
				converter = this.converter.date;
			else if (col.gxControl.type == controlTypes.checkBox)
				converter = this.converter.checkBox;

			conf.fields.push({
				name: col.gxAttName || col.gxAttId,
				mapping: i,  // For the mapping only the column index is sent, because the getJsonAccessor is overriden to access this.properties matrix
				type: colType,
				convert: converter ? Ext.bind(converter, this, [col], true) : undefined
			});

			var colWidth = undefined,
				colFlex = undefined;
			if (col.gxControl.type != controlTypes.comboBox) {
				if (!gx.lang.gxBoolean(col.AutoExpand)) {
					if (col.gxWidthUnit == "px")
						colWidth = col.width || undefined;
					else if (col.gxWidthUnit == "%")
						colFlex = col.width / 100 || undefined;
				}
				else {
					colFlex = 1;
				}
			}

			// WA because the width is not present in the column
			if (!colWidth && col.gxControl.type == controlTypes.comboBox) {
				colWidth = col.gxControl.width || undefined;
			}

			var colCfg = {
				xtype: GE.ColumnRenderers.get(col.gxControl.type),
				id: this.getUniqueId() + '-col-' + col.htmlName,
				dataIndex: col.gxAttName || col.gxAttId,
				header: col.title,
				width: colWidth,
				flex: colFlex,
				hidden: gx.lang.gxBoolean(col.Hidden || false),
				align: col.align,
				hideable: gx.lang.gxBoolean(col.Hideable),
				menuDisabled: gx.lang.gxBoolean(col.MenuDisabled),
				resizable: gx.lang.gxBoolean(col.Resizable) ? undefined : false,
				sortable: gx.lang.gxBoolean(col.Sortable),
				locked: gx.lang.gxBoolean(col.Lock) || undefined,
				checkedValue: col.gxChecked,
				uncheckedValue: col.gxUnChecked,
				gxGrid: this,
				gxColumn: col,
				actualColIndex: i
			};

			var minWidth = parseInt(this.MinColumnWidth);
			if (minWidth)
				colCfg.minWidth = minWidth;

			if (colWidth === undefined && colFlex === undefined)
				colCfg.autoWidth = true;

			if (col.SummaryType != 'none')
				colCfg.summaryType = col.SummaryType;

			if (col.HeaderGroup) {
				var hGroup = conf.headers[col.HeaderGroup];
				if (!hGroup) {
					hGroup = {
						header: col.HeaderGroup,
						columns: []
					};
					conf.headers[col.HeaderGroup] = hGroup;
					conf.columns.push(hGroup);
				}
				hGroup.columns.push(colCfg);
			}
			else
				conf.columns.push(colCfg);
		}
	},

	getStoreId: function () {
		return this.getUniqueId() + '-store';
	},

	getStoreConfig: function (fields) {
		var remoteSort = gx.lang.gxBoolean(this.RemoteSort);
		var storeConfig = {
			storeId: this.getStoreId(),
			remoteSort: remoteSort,
			fields: fields,
			data: this.properties,
			clearOnPageLoad: true,
			proxy: {
				type: 'gxui.memory'
			},
			listeners: {
				'groupchange': function (store) {
					// Remember the GroupField selected by the user.
					if (gx.lang.gxBoolean(this.Grouping)) {
						this.GroupField = store.groupField;
					}
				},
				scope: this
			}
		};

		if (this.pageSize > 0)
			storeConfig.pageSize = this.pageSize;

		if (this.SortField) {
			storeConfig.sorters = {
				property: this.SortField,
				direction: this.SortOrder || "ASC"
			};
		}

		if (gx.lang.gxBoolean(this.Grouping)) {
			if (!storeConfig.sorters) {
				storeConfig.sorters = {
					property: this.GroupField
				};
			}
			storeConfig.groupField = this.GroupField;
		}
		return storeConfig;
	},

	getPagingToolbarConfig: function () {
		var items = [],
			usePaging = this.hasPagingButtons();

		/**
		* @event OnFirstPage
		* Fires when the user clicks the 'first page' paging button. This event is useful when the grid paging is manually programmed.
		*
		*		Event Grid1.OnFirstPage
		*			Do 'Something'
		*			Grid1.FirstPage()
		*		EndEvent
		*/
		if (usePaging || this.OnFirstPage) {
			items.push({
				itemId: 'first',
				tooltip: this.FirstText,
				overflowText: this.FirstText,
				iconCls: "x-tbar-page-first",
				disabled: this.isFirstPage(),
				handler: this.OnFirstPage || Ext.bind(this.goToPage, this, ["first"]),
				scope: this
			});
		}

		/**
		* @event OnPreviousPage
		* Fires when the user clicks the 'previous page' paging button. This event is useful when the grid paging is manually programmed.
		*
		*		Event Grid1.OnPreviousPage
		*			Do 'Something'
		*			Grid1.PreviousPage()
		*		EndEvent
		*/
		if (usePaging || this.OnPreviousPage) {
			items.push({
				itemId: 'previous',
				tooltip: this.PreviousText,
				overflowText: this.PreviousText,
				iconCls: "x-tbar-page-prev",
				disabled: this.isFirstPage(),
				handler: this.OnPreviousPage || Ext.bind(this.goToPage, this, ["prev"]),
				scope: this
			});
		}

		if (usePaging || ((this.OnFirstPage || this.OnPreviousPage) && (this.OnNextPage || this.OnLastPage))) {
			items.push("-");
		}

		/**
		* @event OnNextPage
		* Fires when the user clicks the 'next page' paging button. This event is useful when the grid paging is manually programmed.
		*
		*		Event Grid1.OnNextPage
		*			Do 'Something'
		*			Grid1.NextPage()
		*		EndEvent
		*/
		if (usePaging || this.OnNextPage) {
			items.push({
				itemId: 'next',
				tooltip: this.NextText,
				overflowText: this.NextText,
				iconCls: "x-tbar-page-next",
				disabled: this.isLastPage(),
				handler: this.OnNextPage || Ext.bind(this.goToPage, this, ["next"]),
				scope: this
			});
		}

		/**
		* @event OnLastPage
		* Fires when the user clicks the 'last page' paging button. This event is useful when the grid paging is manually programmed.
		*
		*		Event Grid1.OnLastPage
		*			Do 'Something'
		*			Grid1.LastPage()
		*		EndEvent
		*/
		if (usePaging || this.OnLastPage) {
			items.push({
				itemId: 'last',
				tooltip: this.LastText,
				overflowText: this.LastText,
				iconCls: "x-tbar-page-last",
				disabled: this.isLastPage(),
				handler: this.OnLastPage || Ext.bind(this.goToPage, this, ["last"]),
				scope: this
			});
		}

		if (usePaging || this.OnFirstPage || this.OnPreviousPage || this.OnNextPage || this.OnLastPage) {
			items.push("-");
		}

		items.push({
			itemId: 'refresh',
			tooltip: this.RefreshText,
			overflowText: this.RefreshText,
			iconCls: Ext.baseCSSPrefix + 'tbar-loading',
			handler: this.refreshGrid,
			scope: this
		});

		return {
			itemId: 'toolbar',
			xtype: 'toolbar',
			dock: 'bottom',
			items: items
		};
	},

	updatePagingToolbar: function (tb) {
		if (tb) {
			var first = tb.child('#first'),
				previous = tb.child('#previous'),
				next = tb.child('#next'),
				last = tb.child('#last');

			if (first) {
				first.setDisabled(this.isFirstPage());
			}
			if (previous) {
				previous.setDisabled(this.isFirstPage());
			}
			if (next) {
				next.setDisabled(this.isLastPage());
			}
			if (last) {
				last.setDisabled(this.isLastPage());
			}
		}
	},

	setSelectedRow: function (rowIndex) {
		// Set row as selected
		this.SelectedRow = rowIndex + 1;
		var actualRowIndex = this.getActualRowIndex(this.m_grid, rowIndex);
		this.selectRow(actualRowIndex);
	},

	keepSelection: function (grid) {
		if (this.SelectedRow >= 1) {
			grid.getSelectionModel().select(this.SelectedRow - 1);
			var isLoading = this.ownerGrid.isLoading;
			this.ownerGrid.isLoading = true;
			this.selectRow(this.SelectedRow - 1);
			this.ownerGrid.isLoading = isLoading;
			return false;
		}
	},

	gridListeners: function () {
		return {
			'itemclick': function (view, record, el, rowIndex, e) {
				var actualRowIndex = this.getActualRowIndex(view.panel, rowIndex);
				var row = this.rows[actualRowIndex];
				if (row) {
					this.setSelectedRow(rowIndex);
					// Set context
					if (this.ownerGrid.defaultSetsContext) {
						var setter = this.getGxRowContextSetter(row);
						if (setter) {
							this.notifyContext(setter.types, setter.hdl.call(setter.obj, row));
						}
					}
				}
			},

			'cellclick': function (view, cellEl, columnIndex, record, rowEl, rowIndex, e) {
				var cell = this.getPropertiesCell(view.panel, rowIndex, columnIndex, false);
				if (cell.type == gx.html.controls.types.image || !cell.enabled)
					this.fireCellClickEvent(rowIndex, columnIndex);
			},

			'itemcontextmenu': function (view, record, rowEl, rowIndex, e) {
				if (this.ContextMenu) {
					this.setSelectedRow(rowIndex);
					this.ContextMenu();
					e.preventDefault();
				}
			},

			'sortchange': function (ct, column, direction) {
				if (this.m_grid) {
					this.SortField = column.dataIndex;
					this.SortOrder = direction;
					if (gx.lang.gxBoolean(this.RemoteSort)) {
						// Remember the SortField and SortOrder selected by the user.
						this.m_grid.saveState();
						Ext.defer(this.goToPage, 30, this, ["FIRST"]);
						return false;
					}
				}
			},

			'columnresize': function () {
				this.fixGridWidth();
			},

			'beforestaterestore': function (grid, state) {
				if (gx.lang.gxBoolean(this.RemoteSort)) {
					delete state.sort;
				}
				return true;
			},


			scope: this
		};
	},

	isEditable: function () {
		if (this.editable === undefined) {
			var editable = false;
			for (var i = 0, rows = this.properties.length; i < rows; i++) {
				for (var j = 0, cols = this.properties[i].length; j < cols; j++) {
					editable = editable || gx.lang.gxBoolean(this.properties[i][j].enabled);
					if (editable) {
						this.editable = editable;
						return this.editable;
					}
				}
			}
		}

		return this.editable;
	},

	getActualColumnIndex: function (grid, colIndex) {
		var column = grid.columns[colIndex];
		if (column)
			return column.actualColIndex;
		return -1;
	},

	getActualRowIndex: function (grid, rowIndex) {
		return grid.getStore().getAt(rowIndex).raw[0].row.id;
	},

	getPropertiesCell: function (grid, rowIndex, columnIndex, isActualColIndex) {
		var actualColIndex = columnIndex;
		if (!isActualColIndex) {
			actualColIndex = this.getActualColumnIndex(grid, columnIndex);
		}
		var record = grid.getStore().getAt(rowIndex);
		if (record) {
			return record.raw[actualColIndex];
		}
		return null;
	},

	goToPage: function (page) {
		if (typeof page == "string") {
			if (this.ownerGrid.pagingCommand) {
				this.ownerGrid.pagingCommand(page.toUpperCase());
				return;
			}
			this.UnSelectRows();
			gx.fn.setHidden(this.gxCmpContext + this.gxGridName.toUpperCase() + "PAGING", page.toUpperCase());
			gx.evt.execEvt(this.gxCmpContext + "E" + this.gxGridName.toUpperCase() + "PAGING.", gx.evt.dummyCtrl);

			return;
		}
	},

	refreshGrid: function () {
		var og = this.ownerGrid, po = this.ParentObject;
		if (og.parentObject.autoRefresh && og.refreshVars.length > 0) {
			og.callAsyncRefresh(og.getRefreshParmsUrl())
		}
		else {
			po.executeServerEvent('RFR', true);
		}
	},

	getRowGxInternalId: function (row) {
		return this.ownerGrid.containerName + 'Row_' + row.gxId;
	},

	getGxRowContextSetter: function (row) {
		var trId = this.getRowGxInternalId(row);

		var setter;
		// Find the context source for the row
		Ext.each(gx.fx.ctx.setters, function (s) {
			if (s.id == trId) {
				setter = s;
				return false;
			}
		}, this);

		return setter;
	},

	fireCellClickEvent: function (rowIndex, columnIndex) {
		var grid = this.m_grid;
		var actualColIndex = this.getActualColumnIndex(grid, columnIndex);
		var actualRowIndex = this.getActualRowIndex(grid, rowIndex);
		var cell = this.getPropertiesCell(grid, actualRowIndex, actualColIndex, true);
		if (this.executeEvent) {
			this.executeEvent(actualColIndex, actualRowIndex);
		}
	},

	getSelectedRow: function () {
		return this.SelectedRow;
	},

	beforeEditHandler: function (e) {
		var cell = e.record.raw[e.column.actualColIndex];
		return cell.enabled;
	},

	afterEditHandler: function (editor, e) {
		var actualColIndex = this.getActualColumnIndex(e.grid, e.colIdx),
			cell = this.getPropertiesCell(e.grid, e.rowIdx, actualColIndex, true),
			gxControl = cell.column.gxControl,
			controlTypes = gx.html.controls.types;

		this.setCellValue(cell, e.value);

		// Fire cell click event
		if (gxControl.type == controlTypes.checkBox || gxControl.type == controlTypes.comboBox) {
			this.fireCellClickEvent(e.rowIdx, e.colIdx)
		}

		if (gx.lang.gxBoolean(this.ShowGroupingSummary))
			e.grid.getView().refresh();
	},


	setCellValue: function (cell, value) {
		var gxControl = cell.column.gxControl,
			controlTypes = gx.html.controls.types;

		cell.value = value;

		if (gxControl.type == controlTypes.checkBox) {
			if (typeof value != 'boolean')
				cell.value = value ? cell.column.gxChecked : cell.column.gxUnChecked;
		}

		if (value instanceof Date) {
			var gxdate = value.gxdate;
			cell.value = gxdate.getString();
			if (cell.column.type == gx.types.dateTime) {
				gxdate.HasTimePart = true;
				var validStruct = gxControl.vStruct,
					nDec = validStruct.dec;
				cell.value += ' ' + gxdate.getTimeString(nDec > 3, nDec == 8, nDec > 1);
			}
		}

		if (typeof (value) == "number") {
			cell.value = gxui.GridExtension.Column.prototype.formatNumber(value, gxControl.vStruct);
		}
	},

	fixGridWidth: function () {
		var grid = this.m_grid;
		if (!grid.ownerCt) {
			var columns = grid.columns,
			width = grid.lockable ? 3 : 2;
			if (!this.gxWidth && !this.m_grid.ownerCt) {
				for (var i = 0, len = columns.length; i < len; i++) {
					var col = Ext.getCmp(columns[i].id);
					width += col.getWidth();
				}
				grid.setWidth(width);
			}
		}
	},

	// Methods
	/**
	* Selects a grid row by index (1 based)
	* @param {Number} rowIndex Row index
	* @method
	*/
	SelectRow: function (rowIndex) {
		// Row index is 1 based, for compatibility with GeneXus criteria
		if (rowIndex) {
			this.setSelectedRow(rowIndex - 1);
			this.m_grid.getSelectionModel().selectRow(rowIndex - 1);
		}
	},

	UnSelectRows: function () {
		if (this.SelectedRow != undefined) {
			delete this.SelectedRow;
		}
		this.m_grid.getSelectionModel().deselectAll();
	}
});

Ext.define('gxui.data.proxy.Memory', {
	extend: 'Ext.data.proxy.Memory',
	alias: 'proxy.gxui.memory',
	alternateClassName: 'gxui.data.MemoryProxy',

	reader: {
		type: 'json',
		createAccessor: function (i) {
			return function (obj) {
				if (i == 'id')
					return undefined;
				var hasReturn = obj[i].grid.instanciateRow(obj[i].gridRow);
				var value;
				if (hasReturn && obj[i].column.gxControl.type != gx.html.controls.types.checkBox) {
					var bkpObj = gx.O;
					var pO = obj[i].grid.parentObject;
					gx.setGxO(pO.CmpContext, pO.IsMasterPage);
					value = pO.GXValidFnc[obj[i].column.gxId].val();
					gx.setGxO(bkpObj.CmpContext, bkpObj.IsMasterPage);
				}
				else
					value = obj[i].value;
				if (typeof value == "string")
					value = gx.text.trim(value);
				return value;
			};
		},
		totalProperty: undefined,
		successProperty: undefined
	}
});
