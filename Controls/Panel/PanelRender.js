/**
* @class gxui.Panel
* Panel User Control. Wraps Ext.panel.Panel so it can be used from GeneXus.
*/
Ext.define('gxui.Panel', {
	extend: 'gxui.UserControl',

	SetToolbarData: function(data) {
		this.ToolbarData = data;
	},

	GetToolbarData: function(data) {
		return this.ToolbarData;
	},

	onRender: function() {
		if (gxui.CBoolean(this.UseToolbar)) {
			this.m_gxTbar = new gxui.Toolbar({ register: false });
			this.m_toolbar = this.m_gxTbar.CreateToolbar({
				id: this.getUniqueId() + "_Toolbar",
				data: this.ToolbarData,
				container: this
			});
		}

		var config = this.getConfig();

		if (gxui.CBoolean(this.ShowAsWindow)) {
			config.closeAction = "hide";
			config.renderTo = 'MAINFORM';
			config.modal = gxui.CBoolean(this.Modal);
			config.constrainHeader = true;
			this.m_panel = new Ext.create('Ext.window.Window', config);
		}
		else {
			this.m_panel = Ext.create('Ext.panel.Panel', config);
		}

		if (!gxui.CBoolean(this.ShowAsWindow)) {
			// Add to parent UC container
			if (this.AddToParentGxUIControl == undefined || gxui.CBoolean(this.AddToParentGxUIControl)) {
				this.addToParentContainer(this.m_panel);
			}
			this.m_panel.render(this.getContainerControl());
		}
		else {
			if (gx.lang.gxBoolean(this.Visible)) {
				this.m_panel.show();
			}
		}

		this.m_panel.body.first().enableDisplayMode().show();

		// Register as UC Container
		this.registerCt(this.m_panel.body.first().dom, this.m_panel.add, this.m_panel.doLayout, this.m_panel);
	},

	onRefresh: function() {
		var panel = this.m_panel;
		panel.setTitle(this.Title);
		if (!panel.ownerCt) {
			panel.animate({
				to: {
					width: parseInt(this.Width),
					height: parseInt(this.Height)
				}
			});
		}
		if (gx.lang.gxBoolean(this.Visible) && !this.m_panel.isVisible()) {
			panel.show();
		}
		else {
			if (!gx.lang.gxBoolean(this.Visible) && panel.isVisible()) {
				panel.hide();
			}
		}

		if (gxui.CBoolean(this.UseToolbar)) {
			this.m_gxTbar.SetData(this.ToolbarData);
			this.m_gxTbar.onRefresh();
		}
	},

	getUnderlyingControl: function() {
		return this.m_panel;
	},

	getConfig: function() {
		var config = {
			contentEl: this.getChildContainer("Body"),
			id: this.getUniqueId(),
			title: this.Title,
			headerPosition: this.HeaderPosition,
			width: parseInt(this.Width),
			height: parseInt(this.Height),
			autoScroll: this.Layout == 'default' ? true : false,
			frame: gxui.CBoolean(this.Frame),
			border: gxui.CBoolean(this.Border),
			minWidth: this.MinWidth,
			minHeight: this.MinHeight,
			maxWidth: this.MaxWidth,
			maxHeight: this.MaxHeight,
			collapsible: gxui.CBoolean(this.Collapsible),
			collapsed: gxui.CBoolean(this.Collapsed),
			animateCollapse: gxui.CBoolean(this.AnimateCollapse),
			collapseDirection: this.CollapseDirection,
			resizable: gxui.CBoolean(this.Resizable),
			resizeHandles: this.Handles,
			tbar: this.m_toolbar,
			listeners: this.getListeners(),
			stateful: gxui.CBoolean(this.Stateful),
			stateId: (this.StateId != "") ? this.StateId : undefined,
			layout: this.Layout == 'default' ? undefined : this.Layout
		};

		if (this.IconCls)
			config.iconCls = this.IconCls;
		if (this.Cls)
			config.cls = this.Cls;
		if (!gx.lang.gxBoolean(this.Visible))
			config.hidden = true;

		return config;
	},

	getListeners: function() {
		return {
			'collapse': function() {
				this.Collapsed = "true";
			},

			'expand': function() {
				this.Collapsed = "false";
			},

			'hide': function() {
				this.Visible = false;
				if (this.OnClose) {
					this.OnClose();
				}
			},

			scope: this
		};
	},

	// Methods
	ChangeToolbar: function(toolbarData) {
		if (this.m_gxTbar)
			this.m_toolbar = this.m_gxTbar.ChangeToolbar(toolbarData, this.getUniqueId() + "_Toolbar", this);
	},

	Collapse: function(animate) {
		this.m_panel.collapse(animate);
	},

	Expand: function(animate) {
		this.m_panel.expand(animate);
	},

	DisableToolbarItem: function(itemId) {
		this.m_gxTbar.DisableItem(itemId);
	},

	EnableToolbarItem: function(itemId) {
		this.m_gxTbar.EnableItem(itemId);
	},

	HideToolbarItem: function(itemId) {
		this.m_gxTbar.HideItem(itemId);
	},

	ShowToolbarItem: function(itemId) {
		this.m_gxTbar.ShowItem(itemId);
	},

	CenterWindow: function() {
		if (gxui.CBoolean(this.ShowAsWindow)) {
			this.m_panel.center();
		}
	}
});