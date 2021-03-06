var app = app || {};

app.TaskItemView = Backbone.View.extend({

	tagName: "article",
	className: "task-item",

	displayTemplate: _.template( $("#task-item-display-template").html() ),
	editTemplate: _.template( $("#task-item-edit-template").html() ),

	events: {
		"change input[type=checkbox]":	"doneTask",
		"click input#del-task-btn":		"deleteTask",
		"dblclick .task-text label":	"editTask",
		"mousedown label": 				"setUnselectable",
		"selectstart label": 			"setUnselectable",
		"click .btn-save": 				"saveEditedTask",
		"keyup .task-edit-field": 		"setBtnDisable"
	},

	initialize: function() {
		this.listenTo(this.model, "change", this.synchModel);
		this.listenTo(this.model, "destroy", this.destroyModel);
	},

	render: function () {
		var addTemplate = "";

		if (this.model.get("author") !== this.model.get("executor")
			&& this.model.get("author") === app.loggedUser.name ) {
			addTemplate = "(added to user: " + this.model.get("executor") + ")";
		} else {
			if (this.model.get("author") !== app.loggedUser.name ) {
				addTemplate = "(added by user: " + this.model.get("author") + ")"
			} else {
				addTemplate = "";
			}
		}

		var content = this.displayTemplate({
				text: this.model.get("text"),
				date: app.parseDate( +this.model.get("date") ),
				author: addTemplate
			});

		this.$el.html( content );
		return this.$el;
	},

	deleteTask: function() {
		var root = this;

		if ( app.loggedUser.name === this.model.get("author") ) {
			app.showModalDialog({
				title: 'Warning',
				text: 'Do you really want to remove this task?',
				callback: function(isAgree) {

					if (isAgree) {
						$.ajax({
							type: 'DELETE',
							url: window.location.pathname + "remove-task",
							data: {
								text: root.model.get("text"),
								date: root.model.get("date"),
								userEmail: app.loggedUser.email
							},
							success: function(data) {
								if (data === "true") {
									root.model.destroy();
								}
							}
						});
					}
				}
			});
		} else {
			app.showModalDialog({
				title: "Error",
				text: "You can't remove this task!</br>It hasn't been created by you."
			});
		}

		event.preventDefault();
		return false;
	},

	doneTask: function() {
		var event = event || window.event,
			target = $(event.target) || $(event.srcElement),
			label = target.siblings(".task-text").children("label").eq(0);

		this.model.set('isDone', target.prop("checked") );

		if (this.model.get('isDone') === true ) {
			label.css({"text-decoration":"line-through"}).addClass("task-done");
			location.reload();
		} else {
			label.css({"text-decoration":""}).removeClass("task-done");

			$.ajax({
				type: "POST",
				url: "/change-task-date",
				async: false,						// because server is single threading
				data: {
					executor: app.loggedUser.name,	// correct this expression
					date: this.model.get("date")
				},
				success: function() {
					location.reload();
				}
			});
		}
	},

	editTask: function(ev) {
		var event = event || window.event,
			targetElem = $(event.target) || $(event.srcElement),
			parent = targetElem.parent();

		parent.html('<textarea name="task-text-correct" class="task-edit-field" cols="67" rows="3"></textarea>' +
			'<button class="btn-save">Save</button>');

		// set text in textarea
		parent.find('textarea')
			.val(this.model.get("text") )
			.focus();

		if (this.model.get("text").length == 0 ) {
			parent.find(".btn-save").attr("disabled", "disabled");
		}
	},

	setBtnDisable: function() {
		var event = event || window.event,
			targetElem = $(event.target) || $(window.event.srcElement),
			btnSave = targetElem.siblings(".btn-save"),
			parent = $(".task-text textarea").parent(),
			model = this.model;

		if (!targetElem.val().trim().length) {
			btnSave.attr("disabled", "disabled");
		} else {
			btnSave.removeAttr("disabled");
		}

		if (event.keyCode == 27) {
			app.showModalDialog({
				title: "Warning",
				text: "Do you want to finish the editing task?",
				callback: function(result) {
					if (result) {
						parent.html("<label>" + model.get("text") + "</label>");
					}
				}
			});
		}
	},

	saveEditedTask: function() {
		var target = event.target || window.event.srcElement,
			txtArea = $(target).siblings("textarea"),
			parent = txtArea.parent(".task-text");

		this.model.set("text", txtArea.val().trim() );

		parent.html("<label>" + txtArea.val().trim() + "</label>");

		event.preventDefault();
		return false;
	},

	synchModel: function() {
		// syncronyze with server
		$.ajax({
			type: "POST",
			url: "/change-task",
			async: false,						// because server is single threading
			data: {
				text: this.model.get("text"),
				executor: app.loggedUser.name,	// correct this expression
				author: this.model.get("author"),
				date: this.model.get("date"),
				isDone: this.model.get("isDone")
			}
		});
	},

	destroyModel: function() {
		// remove the view which corresponds to the destroyed model
		this.remove();
	},

	setUnselectable: function() {
		var event = event || window.event;

		event.preventDefault();
		return false;
	}
});

app.parseDate = function(millsec) {
	var date = new Date(millsec);
	return dateFormat = date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " " +
			date.getHours() + ":" + date.getMinutes();
}