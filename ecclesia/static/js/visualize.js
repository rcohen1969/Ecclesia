(function () {
    if ( ! Math.lineToPointDist ) {
        Math.lineToPointDist = function (x, y, x1, y1, x2, y2) {
            return this.round(this.abs((x2-x1)*(y1-y)-(x1-x)*(y2-y1))/this.sqrt(this.pow(x2-x1,2)+this.pow(y2-y1,2)));
        };
    }
}());
$.extend({
    clickOffset : function (e) {
        var type = e.type, offset, x, y;
        if(!e || !type && (type === 'click' || type === 'mousedown' || type === 'mouseup')) {return this;}
        offset = $(e.target).offset(),
        x = parseInt(e.pageX - offset.left, 10),
        y = parseInt(e.pageY - offset.top, 10);
        return {left:x, top:y};
    },
    bindFn      : function (scope, fn) {
        return function () {
            fn.apply(scope, arguments);
        };
    }
});
var ContextMenu = function(config) {
    this.config = {};
    this.menu = {};
    this.context_controller = {};
    var getDefaults = function () {
        return $.extend(true, {
            container_id: 'vu-context-menu',
            element     : $('#canvasContainer'),
            position    : {left: 0, top: 0},
            actions     : {}
        }, config || {});
    };
    this.initialize = function (_config) {
        this.config = getDefaults();
        $.extend(true, this.config, _config || {});
    return this;
    };
};
ContextMenu.prototype = {
    pop         : function (config, context_controller) {
        this.context_controller = context_controller;
        this.initialize(config)
            .buildMenu()
            .menu.css('left', this.config.position.left)
                 .css('top', this.config.position.top)
                 .show();
        return this;
    },
	buildMenu	: function () {
		var c = this.config,
            that = this,
            ul;
		c.element.append('<ul id="'+c.container_id+'"></ul>');
		ul = this.menu = $('#'+c.container_id).empty();
		$.each(c.actions, function (action_name, callback) {
			ul.append('<li/>');
			$('li', ul).last().append('<a href="#">'+action_name+'</a>');
            $('li > a', ul).last().mousedown(function (e) {
                e.stopImmediatePropagation();
                $(this).mouseup(function () {
                    $(this).unbind('mouseup');
                    that.close();
                    callback(that.context_controller);
                    return false;
                });
            });
		});
        return this;
	},
    close       : function () {
        this.menu.detach();
        return this;
    }
};
var Hinter = (function(config) {
    var $container,
        initialized = false;
    var self = {
        init    : function () {
            if ( ! initialized ) {
                initialized = true;
                $container = $('#hintsContainer');
            }
            return self;
        },
        update  : function (hint_id) {
            var hint = hints_metadata[hint_id].text;
            $container.html(hint);
            return self;
        }
    };
    return self;
}());

var Node = function (config) {
	this.config = {
		dimensions	: {},
		id			: -1,
		url			: '',
		name		: '',
		scale		: 1,
		state		: {
			hover   	: false,
			drag    	: false,
			click   	: false,
			indicated	: false
		}
	};
	$.extend(true, this.config, config || {});
};
Node.prototype = {
	toString	: function () {
		return this.config.name;
	},
    clicked     : function (x, y) {
		var s = this.config.scale,
			dims = this.config.dimensions;
        return ((x >= dims.x*s && x <= (dims.x+dims.w)*s) && (y >= dims.y*s && y <= (dims.y+dims.h)*s));
    },
	serialize	: function () {
		return $.param(this.config.dimensions) + '&pk=' + this.config.id;
	},
	loadImage	: function () {
		// setting the background image and making sure the image is loaded
		if(this.config.bg_image && this.config.bg_src) {
			this.config.bg_image.src = this.config.bg_src;
		}
	},
    wrapTitle   : function (container) {
        var container_w = container.width(),
			titles = container.children('a.story_title,a.disc_title,a.group_title'),
        	title_padding = parseInt(titles.css('padding-right'), 10)
                            + parseInt(titles.css('padding-left'), 10);
        titles.width(container_w - title_padding - 2);
        return this;
    },
    roundedRect	: function (ctx,x,y,width,height,radius,fill_color,stroke_color){
		ctx.save();
		// init the colors
		ctx.fillStyle = fill_color;
		ctx.strokeStyle = stroke_color;
		// create the image
		ctx.beginPath();
		ctx.moveTo(x,y+radius);
		ctx.lineTo(x,y+height-radius);
		ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
		ctx.lineTo(x+width-radius,y+height);
		ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
		ctx.lineTo(x+width,y+radius);
		ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
		ctx.lineTo(x+radius,y);
		ctx.quadraticCurveTo(x,y,x,y+radius);
		ctx.fill();
		ctx.stroke();
		// restore former context options
		ctx.restore();
        return this;
    },
	rescale		: function (scale) {
		this.config.scale = scale;
		return this;
	},
    downScale   : function (step, minimum) {
        // everything is rescaled *10 into integers for calculations
        var new_scalse = this.config.scale*10 - step*10;
        if (new_scalse >= minimum) {
            this.rescale(new_scalse/10);
        }
        return this;
    }
};

var Group = function (node_class, config) {
	this.config = {
		alias		: 'group',
		model_name	: 'GroupProfile',
		bg_src		: '/static/img/cork_board.jpg',
		bg_image	: new Image()
	};
	// inheriting Node class
	var dummy = $.extend(true, node_class, this);
	$.extend(true, this, dummy);
	// reconfig
	$.extend(this.config, config || {});
	// set the id that connects this instance to the DOM
    this.DOMid = this.config.alias+'_'+this.config.id;
    this.$element = $('#'+this.DOMid);
    this.draggable = false;

	this.loadImage();
};
Group.prototype = {
	serialize	: function () {
		return $.param(this.config.dimensions) + '&model_name=' + this.config.model_name + '&pk=' + this.config.id;
	},
	addToDOM	: function (container) {
		var c = this.config;
		$('#'+container).append('<div class="'+c.alias+'" id="'+this.DOMid+'"><a href="'+c.url+'" class="'+c.alias+'_title">'+c.name+'</a></div>');
        this.$element = $('#'+this.DOMid);
	},
	position	: function () {
		var c = this.config;
		this.$element.css('left', c.dimensions.x+'px')
					  .css('top', c.dimensions.y+'px');
	},
	draw		: function (ctx) {
		var dims = this.config.dimensions;
		if(this.config.bg_image) {
			var s = this.config.scale,
			    el = this.$element.height(dims.h*s+'px').width(dims.w*s+'px');
            this.wrapTitle(el);
			try {
				ctx.drawImage(this.config.bg_image, dims.x, dims.y, dims.w*s, dims.h*s);
			} catch(e){}
			ctx.strokeRect(dims.x, dims.y, dims.w*s, dims.h*s);
		}
	},
    click		: function (event) {
		var position = $.clickOffset(event),
            that = this,
			config = {
				element : that.$element,
                actions	: {
                    edit_group : $.bindFn(that, that.editGroup)
                },
				position: position
        };
		return config;
	},
    clicked     : function (x, y) {
		return false;
    },
    editGroup   : function () {
        // TODO: improve this, create a real edit dialog
        window.location.href = this.config.url;
    }
};

var Discussion = function (node_class, config) {
	this.config = {
		alias		: 'disc',
		model_name	: 'Discussion',
		bg_src		: '/static/img/whiteboard.jpg',
		bg_image	: new Image()
	};
	// inheriting Node class
	var dummy = $.extend(true, node_class, this);
	$.extend(true, this, dummy);
	// reconfig
	$.extend(this.config, config || {});
	// set the id that connects this instance to the DOM
    this.DOMid = this.config.alias+'_'+this.config.id;
    this.$element = {};
    this.draggable = false;

	this.loadImage();
};
Discussion.prototype = {
	serialize	    : function () {
		return $.param(this.config.dimensions) + '&model_name=' + this.config.model_name + '&pk=' + this.config.id;
	},
	addToDOM	    : function (container) {
		var c = this.config;
		$('#'+container).append('<div class="'+c.alias+'" id="'+this.DOMid+'"><a href="'+c.url+'" class="'+c.alias+'_title">'+c.name+'</a></div>');
        this.$element = $('#'+this.DOMid);
	},
	position	    : function () {
		var c = this.config;
		this.$element.css('left', c.dimensions.x+'px')
					  .css('top', c.dimensions.y+'px');
	},
	draw		    : function (ctx) {
		var dims = this.config.dimensions;
		if(this.config.bg_image) {
			var s = this.config.scale;
			this.$element.height(dims.h*s+'px').width(dims.w*s+'px');
			try {
				ctx.drawImage(this.config.bg_image, dims.x, dims.y, dims.w*s, dims.h*s);
			} catch(e){}
		}
	},
    editDiscussion  : function () {
        // TODO: improve this, create a real edit dialog
        window.location.href = this.config.url;
    }
};

var Story = function (node_class, config) {
    this.config = {
        alias                           : 'story',
        model_name                      : 'Story',
        type                            : 'goal',
        content                         : '',
        ballots                         : 0,
        icon                            : '',
        fill_normal                     : '#e3e3e3',
        fill_normal_indicated           : '#418000',
        fill_hover                      : '#f2f2f2',
        fill_hover_indicated            : '#61a020',
        stroke_normal                   : '#444',
        stroke_hover                    : '#000',
        stroke_normal_indicated         : '#444',
        stroke_hover_indicated          : '#444',
        children                        : {},
        icon_w                          : 32,
        icon_h                          : 32,
        voting                          : {
            add_vote_url    : '',
            remove_vote_url : ''
        }
	};
	// inheriting Node class
	var dummy = $.extend(true, node_class, this);
	$.extend(true, this, dummy);
	// reconfig
	$.extend(this.config, config || {});
    // set the id that connects this instance to the DOM
    this.DOMid = this.config.alias+'_'+this.config.id;
    this.$element = {};
    this.draggable = false;
};
Story.prototype = {
	serialize           : function () {
        var dims = this.config.dimensions;
		return $.param(this.config.dimensions) + '&model_name=' + this.config.model_name + '&pk=' + this.config.id;
	},
	addToDOM            : function () {
		var c = this.config;
		$('#'+c.type+'_container').append('<div class="'+c.alias+'" id="'+this.DOMid+'"><a href="'+c.url+'" class="'+c.alias+'_title">'+c.name+'</a></div>');
        this.$element = $('#'+this.DOMid);
	},
	position            : function () {
		var dims = this.config.dimensions,
			offset_left = $('#'+this.config.type+'_container').position().left;
        // if the new story is positioned outside the container fit it inside
        if(dims.x < offset_left) {
            dims.x = offset_left;
        }
		this.$element.css('left', dims.x+'px')
					  .css('top', dims.y+'px');
	},
    addBallots          : function () {
        var $story_ballots, ballots = this.config.ballots, el = this.$element;
        if (ballots) {
            $story_ballots = $('span.story_ballots', el);
            if (! $story_ballots.length) {
                el.append('<span class="story_ballots">' + ballots + '</span>');
            } else {
                $story_ballots.text(ballots);
            }
        }
        return this;
    },
    getIconsContainer   : function () {
        var $story_icon, el = this.$element;
        $story_icon = $('span.story_icons', el);
        if (! $story_icon.length) {
            el.append('<span class="story_icons"></span>');
            return $('span.story_icons', el);
        }
        return $story_icon;
    },
	draw                : function (ctx) {
		var c = this.config,
            that = this,
            dims = c.dimensions,
			s = c.scale,
            cs = c.state,
			el = this.$element.height(dims.h*s+'px').width(dims.w*s+'px'),
            state = cs.hover ? 'hover' : 'normal',
            $icons_container;
        if (cs.indicated) { state += '_indicated'; }
        if (cs.click) { state = 'click'; }
		if (! $('a.story_content', el).length && c.content && c.content !== '') {
			el.append('<a href="#" class="story_content" title="' + c.content + '"></a>');
			// TODO: replace this tooltip plugin with jQueryUI-1.9's tooltip
			$('a.story_content', el).tooltip({showURL: false});
		}
//        var $add_opinion_button = $('<a/>', {
//            href        : '#',
//            className   : 'add_opinion_button',
//            title       : 'Add opinion'
//        }).appendTo(el).bind('click', function () {
//            that.addOpinion();
//            return false;
//        });
        this.wrapTitle(el)
            .addBallots()
		    .roundedRect(ctx, dims.x, dims.y, dims.w*s, dims.h*s, 5, c['fill_'+state], c['stroke_'+state]);
        if ( ! has_voting && cs.decided ) {
            this.getIconsContainer().addClass('decided');
        }
        try {
            if (c.icon) {
                var img = new Image();
                img.src = c.icon;
                $(img).load(function () {
                    ctx.drawImage(img, dims.x+dims.w*s-c.icon_w, dims.y+dims.h*s-c.icon_h, c.icon_w, c.icon_h);
                });
            }
        } catch(e) {}
        return this;
	},
    hover               : function (ctx) {
        this.config.state.hover = true;
        this.draw(ctx);
        //$('#'+this.DOMid).children('.opinions').show();
    },
    unhover             : function (ctx) {
        this.config.state.hover = false;
        this.draw(ctx);
        //$('#'+this.DOMid).children('.opinions').hide();
    },
    clicked             : function (x, y) {
		return false;
    },
	click               : function (event) {
		var position = $.clickOffset(event),
            that = this,
            c = this.config,
			config = {
				element : that.$element,
                actions : {
                    add_opinion : $.bindFn(that, that.addOpinion),
                    edit_story  : $.bindFn(that, that.editStory),
                    delete_story: $.bindFn(that, that.deleteStory)
                },
				position: position
			};
        if ( c.type !== 'goal' ) {
            config = $.extend(true, {actions : {add_relation: $.bindFn(that, that.addRelation)}}, config);
        }
        if ( has_voting && c.type === 'option' ) {
            config = $.extend(true, {actions : {vote : $.bindFn(that, that.vote)}}, config);
            if ( c.ballots ) {
                config = $.extend(true, {actions : {remove_vote : $.bindFn(that, that.removeVote)}}, config);
            }
        }
		return config;
	},
    addRelation         : function (context_controller) {
        // TODO: move this form initialization into the view controller - by design
        var that = this,
            $form = context_controller.getCreateRelationForm.apply(context_controller, arguments),
            dialog_config,
            config = {
                callback                    : $.bindFn(context_controller, context_controller.init),
                error_callback              : function (response) {
                    $('button', '.ui-dialog-buttonset').removeAttr('disabled');
                    alert(response);
                },
                from_story_title            : that.config.name,
                clean_title_container_class : 'clean_title'
            },
            FC = new FormController(),
            CRFC = new CreateRelationFormController(FC, config),
            submit_f = function () {
                $('button', '.ui-dialog-buttonset').attr('disabled', 'disabled');
                return CRFC.submit.call(CRFC, this, config);
            };
        if ( ! $form ) {
            return false;
        }
        dialog_config= {
            bgiframe: true,
            autoOpen: false,
            height: 300,
            width: 600,
            modal: true,
            title: 'Add Relation',
            buttons: {
                'Create': function() {
                    return submit_f.call(this);
                },
                'Cancel': function() {
                    $(this).dialog('close');
                }
            }
        };
//        dialog_config = $.isPlainObject(config) ? $.extend(true, {}, defaults, config) : defaults;
        $form.dialog(dialog_config).dialog('open');
        $(window).unbind('keypress').keypress(function (e) {
            if ( e.which === 13 ) {
                e.preventDefault();
                return submit_f.call($form[0]);
            }
        });
    },
    addOpinion          : function (context_controller) {
        // TODO: move this form initialization into the view controller - by design
        var that = this,
            $form = context_controller.getCreateOpinionForm.apply(context_controller, arguments),
            config = {
                callback                    : $.bindFn(context_controller, context_controller.init),
                error_callback              : function (response) {
                    $('button', '.ui-dialog-buttonset').removeAttr('disabled');
                    alert(response);
                },
                parent_story_title          : that.config.name,
                clean_title_container_class : 'clean_title'
            },
            FC = new FormController(),
            COFC = new CreateOpinionFormController(FC, config),
            submit_f = function () {
                $('button', '.ui-dialog-buttonset').attr('disabled', 'disabled');
                return COFC.submit.call(COFC, this, config);
            },
            dialog_config ={
                bgiframe: true,
                autoOpen: false,
                height: 300,
                width: 600,
                modal: true,
                title: 'Add Opinion',
                buttons: {
                    'Create': function() {
                        return submit_f.call(this);
                    },
                    'Cancel': function() {
                        $(this).dialog('close');
                    }
                }
            };
//        dialog_config = $.isPlainObject(config) ? $.extend(true, {}, defaults, config) : defaults;
        $form.dialog(dialog_config).dialog('open');
        $(window).unbind('keypress').keypress(function (e) {
            if ( e.which === 13 ) {
                e.preventDefault();
                return submit_f.call($form[0]);
            }
        });
    },
    editStory           : function (context_controller) {
        // TODO: improve this, create a real edit dialog
//        var ref = $('#'+this.DOMid).children('a').first().attr('href');
        window.location.href = this.config.url;
    },
    deleteStory         : function (context_controller) {
        // TODO: allow the confirm title to be translated
        if(confirm('Are you sure you want to delete this story?')) {
            $.post('/discussions/delete_story/', {
                story       : this.config.id,
                discussion  : context_controller.options.discussion,
                group       : context_controller.options.group
            }, function () {
                if(context_controller) {
                    context_controller.init.call(context_controller, true);
                }
            });
        } else {
            return false;
        }
    },
    vote                : function (context_controller) {
        var that = this;
        $.ajax({
            type    : 'post',
            url     : context_controller.options.voting.add_vote_url,
            data    : { story_pk : that.config.id },
            success : function (response) {
                if ( response === 'SUCCESS' ) {
                    that.config.ballots += 1;
                    var $voting_ballots = $('#voting_ballots');
                    $voting_ballots.text(parseInt($voting_ballots.text()) - 1);
                    context_controller.init.call(context_controller, true);
                }
            },
            error   : function (xhr, textStatus, errorThrown) {
                var response = $.parseJSON(xhr.responseText);
                $.each(response, function(k, v) {
                    if (k === 'VOTE_ENDED') {
                        context_controller.options.voting.close_vote_callback();
                        alert(v);
                    }
                });
            }
        });
    },
    removeVote          : function (context_controller) {
        var that = this;
        $.ajax({
            type    : 'post',
            url     : context_controller.options.voting.remove_vote_url,
            data    : { story_pk : that.config.id },
            success : function (response) {
                if ( response === 'SUCCESS' ) {
                    that.config.ballots -= 1;
                    var $voting_ballots = $('#voting_ballots');
                    $voting_ballots.text(parseInt($voting_ballots.text()) + 1);
                    context_controller.init.call(context_controller, true);
                }
            },
            error   : function (xhr, textStatus, errorThrown) {
                var response = $.parseJSON(xhr.responseText);
                $.each(response, function(k, v) {
                    if (k === 'VOTE_ENDED') {
                       context_controller.options.voting.close_vote_callback();
                        alert(v);
                    }
                });
            }
        });
    }
};
var Relation = function (node_class, config) {
	this.config = {
		alias		    : 'relation',
		model_name	    : 'StoryRelation',
		from_id		    : -1,
		to_id		    : -1,
		from		    : {},
		to			    : {},
        children        : {},
        opinions_count  : 0
	};
	// inheriting Node class
	var dummy = $.extend(true, node_class, this);
	$.extend(true, this, dummy);
	// reconfig
	$.extend(this.config, config || {});
};
Relation.prototype = {
	serialize	    : function () {
		return 'model_name=' + this.config.model_name + '&pk=' + this.config.id;
	},
	toString	    : function () {
		return "("+this.config.from.toString()+","+this.config.to.toString()+")";
    },
    getBezierPoints : function () {
        var s = this.config.scale,
		// get the dimensions of the from and to elements
		    from_dims = this.config.from.config.dimensions,
			to_dims = this.config.to.config.dimensions,
		// calculate the from and to points
		    x1 = from_dims.x + from_dims.w*s,
			y1 = from_dims.y + from_dims.h*s/2,
			x2 = to_dims.x,
			y2 = to_dims.y + to_dims.h*s/2;
        return {x1:x1,x2:x2,y1:y1,y2:y2};
    },
    clicked         : function (x, y) {
        // get the control points
        var points = this.getBezierPoints(),
		// make sure we go from upper left to lower right
		    padding = 2,
			x1 = points.x1,
			x2 = points.x2,
			y1 = (points.y1 <= points.y2) ? points.y1 : points.y2,
			y2 = (points.y2 > points.y1) ? points.y2 : points.y1;
		y1 -= padding;
		y2 += padding;
		// check inside a rectangular around the relation
        if((x >= x1 && x <= x2) && (y >= y1 && y <= y2)) {
        	// check if it is close to the approximated diagonal
        		// first calculate the points that create the diagonal
        	var line_x1 = (3*points.x1+points.x2)/4,
        		line_x2 = (points.x1+3*points.x2)/4;
        	return Math.lineToPointDist(x, y, line_x1, points.y1, line_x2, points.y2) <= 3;
        }
        return false;
    },
    click           : function (event) {
        var position = $.clickOffset(event),
            that = this,
			config = {
                actions	: {
                    add_opinion : $.bindFn(that, that.addOpinion),
                    edit_relation: $.bindFn(that, that.editRelation),
                    remove_relation: $.bindFn(that, that.deleteRelation)
                },
				position: position
			};
		return config;
    },
    addOpinion      : function (context_controller) {
        // TODO: move this form initialization into the view controller - by design
        var that = this,
            $form = context_controller.getCreateOpinionForm.apply(context_controller, arguments),
            config = {
                callback                    : $.bindFn(context_controller, context_controller.init),
                error_callback              : function (response) {
                    $('button', '.ui-dialog-buttonset').removeAttr('disabled');
                    alert(response);
                },
                parent_story_title          : that.config.name,
                clean_title_container_class : 'clean_title'
            },
            FC = new FormController(),
            COFC = new CreateOpinionFormController(FC, config),
            submit_f = function () {
                $('button', '.ui-dialog-buttonset').attr('disabled', 'disabled');
                return COFC.submit.call(COFC, this, config);
            },
            dialog_config ={
                bgiframe: true,
                autoOpen: false,
                height: 300,
                width: 600,
                modal: true,
                title: 'Add Opinion',
                buttons: {
                    'Create': function() {
                        return submit_f.call($form[0]);
                    },
                    'Cancel': function() {
                        $(this).dialog('close');
                    }
                }
            };
//            dialog_config = $.isPlainObject(config) ? $.extend(true, {}, defaults, config) : defaults;
        $form.dialog(dialog_config).dialog('open');
        $(window).unbind('keypress').keypress(function (e) {
            if ( e.which === 13 ) {
                e.preventDefault();
                return submit_f.call($form[0]);
            }
        });
    },
    editRelation    : function () {
        window.location.href = this.config.url;
    },
    deleteRelation  : function (context_controller) {
        if(confirm('Are you sure you want to delete this relation?')) {
            $.post('/discussions/delete_relation/'+this.config.id+'/', {
                discussion  : context_controller.options.discussion,
                group       : context_controller.options.group
            }, function () {
                if(context_controller) {
                    context_controller.init.call(context_controller, true);
                }
            });
        } else {
            return false;
        }
    },
    square			: function (ctx, x, y) {
    	var d = 2;
    	ctx.save();
    	ctx.fillStyle = "rgb(200,0,0)";
    	ctx.fillRect (x-d, y-d, 2*d, 2*d);
    	ctx.restore();
    },
    contour			: function (ctx, x1, x2) {
    	var points = this.getBezierPoints(),
    		h = (this.config.from.config.dimensions.h/2)*this.config.scale;
    	ctx.save();
//    	ctx.strokeStyle="rgb(230,130,130)";
    	var y1 = points.y1, y2 = points.y2;
    	if(points.y1 <= points.y2) {
    		y1 += h;
    		y2 -= h;
    	} else {
    		y1 -= h;
    		y2 += h;
    	}
    	ctx.moveTo(points.x1, points.y1);
    	ctx.lineTo(points.x1, y1);
    	ctx.lineTo(x1, y1);
    	ctx.lineTo(x1, points.y1);
    	ctx.lineTo(points.x1, points.y1);
    	ctx.stroke();
    	ctx.moveTo(points.x2, points.y2);
    	ctx.lineTo(points.x2, y2);
    	ctx.lineTo(x2, y2);
    	ctx.lineTo(x2, points.y2);
    	ctx.lineTo(points.x2, points.y2);
    	ctx.stroke();
    	this.diagonal(ctx, x1+(points.x1-x1)/2, points.y1, x2+(points.x2-x2)/2, points.y2);
    	ctx.restore();
    },
    diagonal		: function (ctx, x1, y1, x2, y2) {
    	ctx.save();
    	ctx.moveTo(x1, y1);
    	ctx.lineTo(x2, y2);
    	ctx.stroke();
    	ctx.restore();
    },
	bezier		    : function (ctx,x1,y1,x2,y2,label) {
		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = 4;
		ctx.strokeStyle="rgb(20,20,20)";
		ctx.moveTo(x1,y1);
//		this.square(ctx, x1+(x2-x1)/2, y1);
//		this.square(ctx, x2-(x2-x1)/2, y2);
		ctx.bezierCurveTo(x1+(x2-x1)/2,y1,x2-(x2-x1)/2,y2,x2,y2);
		ctx.stroke();
//		this.contour(ctx, x1+(x2-x1)/2, x2-(x2-x1)/2);
		//drawText(label,(x1+x2)/2, (y1+y2)/2, x2-x1,Math.atan2(y2-y1,x2-x1));
		ctx.restore();
        return this;
    },
	addToDOM	    : function (container) {
		var c = this.config;
		$('#'+container).append('<div class="'+c.alias+'" id="'+c.alias+'_'+c.id+'"><a href="'+c.url+'" class="'+c.alias+'_title">'+c.name+'</a></div>');
	},
    clearChildrenViz: function () {
        this.config.opinions_count = 0;
        $.each(this.config.children, function (id, child) {
            child.config.added = false;
        });
    },
	draw		    : function (ctx) {
		//get the control points
        var points = this.getBezierPoints();
		// draw it
		this.bezier(ctx, points.x1, points.y1, points.x2, points.y2)
        // and clear its children's visualization state
            .clearChildrenViz();
	}
};
var Opinion = function (node_class, config) {
	this.config = {
		alias		: 'opinion',
		model_name	: 'Opinion',
		type		: 'good',
		parent_id	: -1,
		parent		: {},
		container_id: '',
		added		: false
	};
	// inheriting Node class
	var dummy = $.extend(true, node_class, this);
	$.extend(true, this, dummy);
	// reconfig
	$.extend(this.config, config || {});
};
Opinion.prototype = {
	serialize	: function () {
		return 'model_name=' + this.config.model_name + '&pk=' + this.config.id;
	},
	addToDOM	: function () {
		var c = this.config;
        if ( c.parent.config.alias === 'relation' ) { return this; }
		$('#'+c.container_id).append('<div class="'+c.alias+'" id="'+c.alias+'_'+c.id+'"></div>');
	},
	container	: function () {
		if(this.config.parent.config) {
			var c = this.config,
				s = c.scale,
				pc = c.parent.config;
			c.container_id = pc.alias+'_'+pc.id+'_'+c.type;
			// try getting the container from the DOM
			var id_selector = '#'+c.container_id,
				container = $(id_selector);
			// check if the container exists and return if it does
			if(container.length) { return this; }
			// if it doesn't we create it
            var parent_dims = pc.dimensions,
				margin = 3,
				opn_edge = Math.ceil(24*s),
				x,y;
			$('#'+pc.alias+'_'+pc.id).append('<div class="opinions '+c.type+'_opinions" id="'+c.container_id+'"><canvas width="'+opn_edge+'" height="'+opn_edge+'" id="'+c.container_id+'_bg" class="opinion_container_bg"></canvas><a href="#"></a></div>');
			// position the container and set its style
			switch(c.type) {
				case 'good': {
					x = parent_dims.w*s - opn_edge;
					y = - (opn_edge);
				} break;
				case 'bad': {
					x = parent_dims.w*s - opn_edge*2 -2; //adding 2 for borders
					y = - (opn_edge);
				} break;
				case 'true': {
					x = parent_dims.w*s - opn_edge*3 -4;
					y = - (opn_edge);
				} break;
				case 'false': {
					x = parent_dims.w*s - opn_edge*4 -6;
					y = - (opn_edge);
				} break;
			}
			$(id_selector).css('left', x+'px')
			              .css('top', y+'px');
            // draw its background
            this.drawContainerBg(c.container_id);
			return this;
		} else {
			throw new Error('No parent element is set for: '+c.id);
		}
	},
	position	    : function () {},
    bezier		    : function (ctx,x1,y1,x2,y2,color) {
		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = 2;
		ctx.strokeStyle=color;
		ctx.moveTo(x1,y1);
		ctx.bezierCurveTo(x1+(x2-x1)/2,y1,x2-(x2-x1)/2,y2,x2,y2);
		ctx.stroke();
		ctx.restore();
    },
	draw		    : function (ctx) {
        var c = this.config,parent,points,offset = 0,anchor,opns;
        if( ! c.added ) {
            if ( c.parent instanceof Relation ) {
                parent = c.parent;
                opns = parent.config.opinions_count;
                points = parent.getBezierPoints.call(parent);
                offset = (opns % 2) ? opns+1 : opns*(-1);
                parent.config.opinions_count = opns + 1;
                this.bezier(ctx, points.x1, points.y1+offset, points.x2, points.y2+offset, this.pickColor(c.container_id));
            } else {
                anchor = $('a', '#'+c.container_id),
                opns = parseInt(anchor.text(), 10);
                if ( ! opns ) { opns = 1; }
                         else { opns += 1; }
                anchor.text(opns);
                anchor.attr('title', c.type + ': ' + opns);
            }
			c.added = true;
		}
	},
    drawContainerBg : function (container_id) {
        var s = this.config.scale,
            id = container_id+'_bg',
            ctx = $('#'+id)[0].getContext('2d'), // get the context
        // getting the current size definitions
            w = $('#'+container_id).innerWidth()*s,
            h = $('#'+container_id).innerHeight()*s,
            color;
        // redefining the size & color
        $('#'+container_id).height(h).width(w);
        color = this.pickColor(container_id);
        if(ctx) {
            this.roundedRect(ctx, 0, 0, w, h, 8*s, color, '#666');
        }
    },
    pickColor       : function (container_id) {
        var color,type = container_id.split('_').reverse()[0];
        switch(type) {
            case 'good': color = '#cfc'; break;
            case 'bad': color = '#fcc'; break;
            case 'true': color = '#ccf'; break;
            case 'false': color = '#ffc'; break;
            default: '#eee'; break;
        }
        return color;
    },
    downScale       : function (scale) {

    }
};

var VUController = function (options) {
	this.options = $.extend(true, {
        width		        : 973,
        height		        : 598,
        bg_pic              : '',
        container_id        : 'canvasContainer',
        canvas_id	        : 'groupsvu',
        data_url	        : '/get_groups_view_json/',
        update_db_url   	: '/common/update_presentation/',
        update_status_url	: null,
        meta_url	        : '',
        last_changed        : '',
        update_timeout      : 5000,
        user_permissions    : null,
        dialog_title        : '',
//        zoom_slider	        : {
//            change		: $.bindFn(this, this.zoom),
//            orientation	: 'vertical',
//            animate     : 'fast',
//            step		: 0.1,
//            min			: 0.5,
//            max			: 1.1,
//            value		: 0.7
//        },
        zoom                : {
            scale   : 0.8,
            step    : 0.1,
            min     : 0.5
        }
    }, options || {});

    this.data = {};
	this.elems = {};
	this.drag = {};
	this.click = null;
	this.ctx = null;
	this.menu = new ContextMenu();
    this.timeoutID = 0;
    this.drag_disabled = false;
};
VUController.prototype = {
	init				: function (loaded) {
        var _VUC = this;
        this.elems = {};  // clean this object
        if(loaded === true) {
            // get the data
			this.getData();
		} else if (typeof loaded === 'string') { // loaded may be the time signature of the last_related_update
            if (this.options.last_changed !== loaded) { // if it does not hold the same time
                this.options.last_changed = loaded; // reset and reload data
                return this.init(true);
            } else {
                return this.init(); // time is the same
            }
        } else {
			// create the elements
			this.createNodes();
			// initialize the canvas
			if(this.initCanvas()) {
				// set the controls for the heart of the sun
				this.setVUEvents();
				// appending a scaling slider
//                if($.isPlainObject(this.options.zoom_slider) && $.isFunction(this.options.zoom_slider.change)) {
//                    this.initZoom();
//                }
                // initialize dialog box
                this.initDialog();
				// iterate over the elements and create the GUI
				$.each(this.elems, function (id, el) {
					// scale element
					_VUC.rescale(el)
                    // appending each element as a DOM element to the canvas container
                        .addElement(el)
					// position the element inside the container
					    .position(el)
					// set it as draggable
					    .setDraggable(el)
                    // set other event handlers
                        .setEventHandlers(el);
				});
				this.draw()
                // position nodes' titles in their middle
//                    .positionTitles()
                // initialize the visualization updater
                    .setVUUpdater()
                // set some visual aspects related to discussion view
                    .setAjaxSetup();
			} else {
				alert('No canvas context.');
			}
		}
        return this;
	},
    setVUUpdater        : function (clear_only) {
        if ( this.timeoutID ) {
            clearTimeout(this.timeoutID);
            this.timeoutID = 0;
        }
        if ( ! clear_only ) {
            this.timeoutID = setTimeout($.bindFn(this, this.updateView), this.options.update_timeout);
        }
        return this;
    },
    getData				: function () {
		var _VUC = this;
		// expecting format: [ { element_alias : { element_config_object }, ... ]
		$.getJSON(this.options.data_url, function (data){
			_VUC.data = data;
			// initialize the view controller
			_VUC.init.call(_VUC);
		});
	},
    updateView          : function () {
        if(!this.options.update_status_url) { return; } // ignore and don't update
        var _VUC = this;
        this.drag_disabled = true;
        $.ajax({
            type    : 'POST',
            url     : _VUC.options.update_status_url,
            data    : { last_changed : _VUC.options.last_changed },
            //timeout : _VUC.options.update_timeout,
            success : function (response) {
                if(response) {
                    clearTimeout(_VUC.timeoutID);
                    this.drag_disabled = false;
                    if(_VUC.options.last_changed !== response) {
                        _VUC.init.call(_VUC, response);
                    } else {
                        _VUC.setVUUpdater.call(_VUC);
                    }
                }
            }
        });
    },
    updateDB	        : function () {
		var _VUC = this;
		this.data = this.drag.serialize() + '&last_changed=' + this.options.last_changed;
        $.ajax({
            type		: "POST",
            url			: _VUC.options.update_db_url,
            data		: _VUC.data,
            async       : true,
            success		: function (response){
                _VUC.options.last_changed = response;
            }
        });
	},
    initCanvas			: function () {
		var o = this.options,canvas;
		$('#'+o.container_id).empty().height(o.height).width(o.width);
		$('#'+o.container_id).append('<canvas id="'+o.canvas_id+'" width="'+o.width+'" height="'+o.height+'"></canvas>');
		canvas =document.getElementById(o.canvas_id);
        // check if there's no canvas support
        if ( ! canvas.getContext ) {
            // check if we fixed it using excanvas
            if ( G_vmlCanvasManager && G_vmlCanvasManager.initElement ) {
                try {
                    G_vmlCanvasManager.initElement(canvas);
                } catch (ex) {
                    return false;
                }
            } else {
                // bail out...
                return false;
            }
        }
        this.ctx = canvas.getContext('2d');
		return this.ctx;
	},
	setVUEvents			: function () {
		var _VUC = this,
            o = this.options;
        // turn off the context menu on the canvas' container
        $('#'+o.container_id)[0].oncontextmenu = function() {
            return false;
        };
        if (o.user_permissions && o.user_permissions === 'allowed') {
            $('#'+o.canvas_id).mousedown(function (e) {
                var event = e;
                $(this).mouseup(function () {
                    $(this).unbind('mouseup');
                    //  if the click property is set then unset it and clear the menu
                    if(_VUC.click) {
                        _VUC.click = null;
                        _VUC.menu.close.call(_VUC.menu, e);
                    } else {
                        // if this is a right click > start rolling
                        if(event.which == 3) {
                            var offset = $.clickOffset(e);
                            $.each(_VUC.elems, function (id, el) {
                                if(el.clicked.call(el, offset.left, offset.top)) {
                                    if(el.click && $.isFunction(el.click)) {
                                        _VUC.click = el;
                                        _VUC.menu.pop.call(_VUC.menu, el.click.call(el, e), _VUC);
                                    }
                                }
                            });
                            // there was click, we should open the menu, but not on an element
                            // open it on the canvas
                            if(!_VUC.click) {
                                // just to indicate that menu is popped
                                _VUC.click = true;
                                _VUC.menu.pop.call(_VUC.menu, _VUC.getClickConfig.call(_VUC, e), _VUC);
                            }
                        }
                    }
                })
            });
        }
    },
//    initZoom			: function () {
//        if($('#vuslider').length == 0) {
//            // add a container element for the slider
//            $('#'+this.options.container_id).after('<div id="vuslider"></div>');
//            // init & bind the onChange callback to this controller
//            this.options.zoom_slider.change = $.bindFn(this, this.zoom);
//            // init slider
//            $('#vuslider').slider(this.options.zoom_slider);
//        }
//    },
    initDialog          : function () {
        var _VUC = this,
            $dialog = $('#create_form'),
            submit_f = function() {
                $('button', '.ui-dialog-buttonset').attr('disabled', 'disabled');
                var _config = {
                    callback        : $.bindFn(_VUC, _VUC.init),
                    error_callback  : function (response) {
                        $('button', '.ui-dialog-buttonset').removeAttr('disabled');
                        alert(response);
                    }
                },
                FC = new FormController();
                return FC.submit.call(FC, $dialog[0], _config);
            };
        if (this.options.user_permissions && this.options.user_permissions === 'allowed') {
            $dialog.dialog({
                bgiframe: true,
                autoOpen: false,
                height: 402,
                width: 787,
                modal: true,
                title: _VUC.options.dialog_title,
                buttons: {
                    'Create': function () {
                        return submit_f();
                    },
                    'Cancel': function() {
                        $dialog.dialog('close');
                    }
                }
            });
            $(window).unbind('keypress').keypress(function (e) {
                if ( e.which === 13 ) {
                    e.preventDefault();
                    submit_f();
                }
            });
        }
    },
    createNodes         : function () {
        var _VUC = this;
        $.each(this.data, function (i, item) {
            $.each(item, function (key, conf) {
                var node = new Node({});
                switch(key) {
                    case 'group':
                        node = new Group(node, conf);
                        break;
                    case 'discussion':
                        node = new Discussion(node, conf);
                        break;
                    case 'story':
                        node = new Story(node, conf, _VUC.options);
                        break;
                    case 'relation':
                        node = new Relation(node, conf);
                        break;
                    case 'opinion':
                        node = new Opinion(node, conf);
                        break;
                    default:
                        // data is corrupted, reload
                        return _VUC.init.call(_VUC, true);
                }
                var c = node.config;
                var id = c.alias+'_'+c.id;
                // add the Node instance to the controller's elements
                _VUC.elems[id] = node;
                // set a load event listener to the element's background image to initialy draw it
                if(c.bg_image) {
                    $(c.bg_image).load(function () {
                        node.draw.call(node, _VUC.ctx);
                    });
                }
            });
        });
        // make sure that the elements fit their containers
        this.checkScale();
        // create references for relations between them
        this.setElementsRelations();
        return this;
    },
    addElement          : function (el) {
        // add an element to the DOM
        if (el) {
            el.addToDOM.call(el, this.options.container_id);
        }
        // add all elements to the DOM
        else {
            var _VUC = this;
            $.each(this.elems, function (id, el) {
                _VUC.addElement(el);
            });
        }
        return this;
    },
    setElementsRelations: function () {
        var _VUC = this,children_refs_obj;
        $.each(this.elems, function (key, el) {
            var c = _VUC.elems[key].config;
            if ( c.children && c.children.length ) {
                children_refs_obj = {};
                $.each(c.children, function (i, child_id) {
                    children_refs_obj[child_id] = _VUC.elems[child_id];
                });
                c.children = children_refs_obj;
            }
            if ( el instanceof Relation ) {
                c.from = _VUC.elems[c.from_id];
                c.to = _VUC.elems[c.to_id];
            } else if ( el instanceof Opinion ) {
                c.parent = _VUC.elems[c.parent_id];
            }
        });
    },
    setDraggable		: function (el) {
        var _VUC = this;
        // checking for user permissions
        if (! this.options.user_permissions || this.options.user_permissions !== 'allowed') {return this;}
        // set a specific element as draggable
        if(el) {
            if(el.DOMid) {
                el.$element.draggable({
                    containment : 'parent',
                    delay       : 50,
                    start: function (e, ui) {
                        el.config.state.drag = true;
                        _VUC.drag = el;
                        _VUC.grip.call(_VUC);
                    },
                    stop : function (e, ui) {
                        var position = $(this).position();
                        el.config.state.drag = false;
                        el.config.dimensions.x = parseInt(position.left, 10);
                        el.config.dimensions.y = parseInt(position.top, 10);
                        _VUC.drop.call(_VUC);
                    }
                });
                el.draggable = true;
            }
        }
        // set all elements as draggable
        else {
            $.each(this.elems, function (id, el) {
                _VUC.setDraggable(el);
            });
        }
        return this;
    },
    disableDraggable		: function (el) {
        var _VUC = this;
		// disable draggable functionality
		if(el) {
            if(el.draggable) {
                el.$element.draggable('disable');
                return true
            } else {
            // draggable was not initialized yet, bail out
            return false;
            }
        }
        // disable all the elements' draggable functionality
		else {
			$.each(this.elems, function (id, el) {
				var keep_going = _VUC.disableDraggable(el);
                if (! keep_going) { return false; } // break
			});
		}
        return this;
    },
    enableDraggable		: function (el) {
        var _VUC = this;
		// enable draggable functionality
		if(el) {
            if(el.draggable) {
                el.$element.draggable('enable');
                return true;
            } else {
                // draggable was not initialized yet, bail out
                return false;
            }
        }
        // enable all the elements' draggable functionality
		else {
			$.each(this.elems, function (id, el) {
				var keep_going = _VUC.enableDraggable(el);
                if (! keep_going) { return false; } // break
			});
		}
        return this;
    },
    setEventHandlers    : function (el) {
        if(el && el.DOMid) {
            var _VUC = this;
            if(el.hover && $.isFunction(el.hover)) {
                el.$element.hover(
                    function () {
                        if(el.config.state.drag) { return; }
                        else { el.hover.call(el, _VUC.ctx); }
                    },
                    function () {
                        if(el.config.state.drag) { return; }
                        else { el.unhover.call(el, _VUC.ctx); }
                    }
                );
            }
            if (this.options.user_permissions && this.options.user_permissions === 'allowed') {
                // attach the event to all elements, no need to add children because of bubbling
                el.$element.mousedown(function (e) {
                    var event = e;
                    if(_VUC.click) {
                        // if this is a click on the context menu on a Group
                        if(_VUC.click instanceof Group && $(event.target).parents('ul').length) {
                            if($(event.target).parents('ul')[0].id === _VUC.menu[0].id) {
                                _VUC.click = null;
                                $(event.target).mousedown();
                                if(event.which === 3) {
                                    $(this)[0].oncontextmenu = function () {
                                        return false;
                                    }
                                }
                                return false;
                            }
                        } else {
                            _VUC.click = null;
                            _VUC.menu.close.call(_VUC.menu);
                        }
                    }
                    $(this).mouseup(function () {
                        event.stopPropagation();
                        $(this).unbind('mouseup');
                        if(el.click && $.isFunction(el.click)) {
                            // if this is a right click > start rolling
                            if(event.which === 3) {
                                _VUC.click = el;
                                _VUC.menu.pop.call(_VUC.menu, el.click.call(el, event), _VUC);
                            }
                            $(this)[0].oncontextmenu = function () {
                                return false;
                            }
                        }
                    });
                });
            }
        }
    },
	position			: function (el) {
		if(el.position && $.isFunction(el.position)) {
			el.position.call(el);
		}
        return this;
	},
    rescale             : function (el) {
        if (el && el.rescale && $.isFunction(el.rescale)) {
            el.rescale.call(el, this.options.zoom.scale);
        }
        return this;
    },
    checkScale          : function () {
        var containers = {},
            o = this.options,
            max_height = o.height,
            margin = 10,
            down_scale = false,
            scale = o.zoom.scale,
            new_scale;
        $.each(this.elems, function (id, el) {
            var c = el.config, type;
            if ( ! (el instanceof Story) ) { return true; } // continue
            type = c.type;
            if ( ! containers[type] ) {
                containers[type] = parseInt(c.dimensions.h*scale, 10);
            } else {
                containers[type] += parseInt(c.dimensions.h*scale, 10) + margin;
            }
        });
        $.each(containers, function (name, height) {
            if (height > max_height) {
                down_scale = true;
                return false; // break
            }
        });
        if (down_scale) {
            new_scale = (scale*10) - (o.zoom.step*10);
            if (new_scale >= o.zoom.min*10) {
                this.options.zoom.scale = new_scale/10;
                // resize GUI text
                $('#' + o.container_id).css('fontSize', 16*scale + 'px');
            }
            if (new_scale > o.zoom.min*10) { return this.checkScale(); }
        }
        return this;
    },
    draw                : function (isGrip) {
        var _VUC = this,
            drawContent = function () {
                $.each(this.elems, function (id, el) {
                    if(isGrip) {
                        if(id != _VUC.drag.config.alias+'_'+_VUC.drag.config.id) {
                            el.draw.call(el, _VUC.ctx);
                        }
                    } else {
                        el.draw.call(el, _VUC.ctx);
                    }
                });
                return this;
        },
            drawCanvasBg = function () {
                var o = this.options,
                    ctx = this.ctx,
                    img,pattern;
                img = new Image();
                img.src = o.bg_pic;
                img.onload = function () {
                    pattern = ctx.createPattern(img, 'repeat');
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, o.width, o.height);
                    drawContent.call(_VUC);
                }
        };
        if(this.options.bg_pic != '') {
            drawCanvasBg.call(_VUC);

        } else {
            this.ctx.clearRect(0, 0, this.options.width, this.options.height);
            drawContent.call(_VUC);
        }
        return this;
	},
    positionTitles      : function () {
        return this;
    },
	grip				: function () {
        $('#'+this.drag.config.alias+'_'+this.drag.config.id).addClass('dragon');
		this.draw(true);
	},
	drop				: function () {
        $('#'+this.drag.config.alias+'_'+this.drag.config.id).removeClass('dragon');
        this.draw().updateDB();
	},
//	zoom				: function (event, ui) {
//        this.options.zoom.scale = ui.value;
//        // resize titles
//		$('#'+this.options.container_id).animate( { fontSize: 16*ui.value+'px' }, 'fast');
//		this.init(true);
//	},
    getCreateGroupForm  : function  (event) {
        var form = $('#create_form');
        if (event) {
            offset = $.clickOffset(event),
            y = offset.top,
            x = offset.left;
        } else {
            var x = 300,
                y = 400;
        }
        // add initial position
        form.append('<input type="hidden" name="x" value="'+x+'" />' +
                    '<input type="hidden" name="y" value="'+y+'" />');
        return form;
    },
    getClickConfig      : function (event) {
        var _VUC = this,
            position = $.clickOffset(event),
            config = {
                actions : {
                    add_group : function () {
                        _VUC.click = null;
                        _VUC.getCreateGroupForm(event).dialog('open');
                    }
                },
                position: position
        };
        return config;
    },
    setAjaxSetup        : function () {
        var _VUC = this, $body = $('body');
        // cancel the appearance of
        $('#ajax_loader').remove();
        $body.ajaxStart(function () {
//            $body.addClass('wait');
            if (_VUC.drag_disabled) {
//                $body.addClass('disabled');
            }
            _VUC.disableDraggable();
        })
             .ajaxStop(function () {
            _VUC.enableDraggable();
//            $body.removeClass('wait disabled');
        });
//             .ajaxError(function (event, XMLHttpRequest, ajaxOptions, thrownError) {
//            alert(XMLHttpRequest.responseText);
//        });
        return this;
    }
};
/**
 *	A controller class that handles Group view GUI.
 *	Accepts a VUController object instance and inherits it
 *	using jQuery.extend()
 */
var GroupController = function (VuController, options) {
    this.options = {};
	// inheriting Node class
	var dummy = $.extend(true, VuController, this);
	$.extend(true, this, dummy);
	// set the options
	$.extend(this.options, options || {});
};
GroupController.prototype = {
    setEventHandlers    : function (el) {
        if(el && el.DOMid) {
            var _VUC = this;
            if(el.hover && $.isFunction(el.hover)) {
                el.$element.hover(
                    function () {
                        if(el.config.state.drag) { return; }
                        else { el.hover.call(el, _VUC.ctx); }
                    },
                    function () {
                        if(el.config.state.drag) { return; }
                        else { el.unhover.call(el, _VUC.ctx); }
                    }
                );
            }
            if (this.options.user_permissions && this.options.user_permissions === 'allowed') {
                // attach the event to all elements, no need to add children because of bubbling
                el.$element.mousedown(function (e) {
                    var event = e;
                    if(_VUC.click) {
                        // if this is a click on the context menu on a Discussion
                        if(_VUC.click instanceof Discussion && $(event.target).parents('ul').length) {
                            if($(event.target).parents('ul')[0].id === _VUC.menu[0].id) {
                                _VUC.click = null;
                                $(event.target).mousedown();
                                if(event.which === 3) {
                                    $(this)[0].oncontextmenu = function () {
                                        return false;
                                    }
                                }
                                return false;
                            }
                        } else {
                            _VUC.click = null;
                            _VUC.menu.close.call(_VUC.menu);
                        }
                    }
                    $(this).mouseup(function () {
                        event.stopPropagation();
                        $(this).unbind('mouseup');
                        if(el.click && $.isFunction(el.click)) {
                            // if this is a right click > start rolling
                            if(event.which === 3) {
                                _VUC.click = el;
                                _VUC.menu.pop.call(_VUC.menu, el.click.call(el, event), _VUC);
                            }
                            $(this)[0].oncontextmenu = function () {
                                return false;
                            }
                        }
                    });
                });
            }
        }
    },
    getCreateDiscussionForm : function  (event) {
        // serves only as an alias for getCreateGroupForm
        // does the exactly the same
        return this.getCreateGroupForm.call(this, event);
    },
    getClickConfig          : function (event) {
        var _VUC = this,
            position = $.clickOffset(event),
            config = {
                actions : {
                    add_discussion : function () {
                        _VUC.click = null;
                        _VUC.getCreateDiscussionForm(event).dialog('open');
                    }
                },
                position: position
        };
        return config;
    }
};

/**
 *	A controller class that handles Discussions GUI.
 *	Accepts a VUController object instance and inherits it
 *	using jQuery.extend()
 */
var DiscussionController = function (VuController, options) {
    this.options = {
        discussion_type         : 1,
        speech_container_class  : 'stories_container'
    };
	// inheriting Node class
	var dummy = $.extend(true, VuController, this);
	$.extend(true, this, dummy);
	// set the options
	$.extend(this.options, options || {});

    this.metaData;
};
DiscussionController.prototype = {
    getData                 : function () {
        var _DC = this;
        // expecting format: [ { element_alias : { element_config_object }, ... ]
        $.getJSON(this.options.data_url, {}, function (data) {
            _DC.data = data && data.discussion && data.discussion.elements;
            // get the Visualization's meta data
            if ( ! _DC.metaData ) {
                _DC.getVisualizationMetaData.call(_DC);
            } else {
                _DC.init.call(_DC);
            }
            Hinter.init().update(data.discussion.workflow_status);
        });
    },
	getVisualizationMetaData: function () {
		var _DC = this;
		$.getJSON(this.options.meta_url, {discussion_type:this.options.discussion_type}, function (json) {
            // apply the received data
            _DC.metaData = json;
            // initialize the view controller
            _DC.init.call(_DC);
		});
	},
    initVisualization       : function () {
        var _DC = this,
            $container = $('#'+_DC.options.container_id);
        // setting the speech act containers
        $.each(this.metaData, function (i, item) {
            var name = item.fields.name;
            switch(item.fields.story_type) {
                case 1: { // story
                    $('<div/>', {
                        id          : name + '_container',
                        pk          : item.pk,
                        className   : _DC.options.speech_container_class
                    }).appendTo($container).append(
                        '<h2>'+
                        name+
                        '<input class="add_story_button ui-button ui-state-default ui-corner-all" value="+" name="'+item.pk+
                        '" type="button"/></h2>'
                    ).find('input').click(function () {
                        _DC.getCreateStoryForm(null, $(this).attr('name')).dialog('open');
                        return false;
                    });
                } break;
                case 2: { // opinion
                } break;
                case 3: { // relation
                } break;
            }
        });
        // set some style options
        $('.stories_container').height(this.options.height)
                               .width(this.options.width * 0.25 - 1);
    },
	initCanvas			    : function () {
        var o = this.options, canvas;
		$('#'+o.container_id).empty()
                             .append('<canvas id="'+o.canvas_id+'" width="'+o.width+'" height="'+o.height+'"></canvas>');
		canvas =document.getElementById(o.canvas_id);
        // check if there's no canvas support
        if ( ! canvas.getContext ) {
            // check if we fixed it using excanvas
            if ( G_vmlCanvasManager && G_vmlCanvasManager.initElement ) {
                try {
                    G_vmlCanvasManager.initElement(canvas);
                } catch(e) {
                    return false;
                }
            } else {
                // bail out...
                return false;
            }
        }
        this.ctx = canvas.getContext('2d');
        // setting background
        var _DC = this;
        if(o.bg_pic != '' && false) {
            try {
                var img = new Image();
                img.src = o.bg_pic;
                $(img).load(function () {
                    _DC.ctx.drawImage(img, 0, 0, o.width, o.height);
                });
            } catch(e) {}
        }
        if(this.metaData.length != 0) {
            this.initVisualization();
        }
		return (this.ctx);
	},
    initDialog              : function (config) {
        var _DC = this,
            submit_f = function () {
                $('button', '.ui-dialog-buttonset').attr('disabled', 'disabled');
                var _config = {
                    callback        : $.bindFn(_DC, _DC.init),
                    error_callback  : function (response) {
                        $('button', '.ui-dialog-buttonset').removeAttr('disabled');
                        alert(response);
                    }
                },
                FC = new FormController();
                return FC.submit.call(FC, $('form[name=story_create]')[0], _config);
            },
            defaults = {
                bgiframe: true,
                autoOpen: false,
                height: 250,
                width: 600,
                modal: true,
                title: 'Add Story',
                buttons: {
                    'Create': function() {
                        return submit_f();
                    },
                    'Cancel': function() {
                        $(this).dialog('close');
                    }
                }
            },
            dialog_config = $.isPlainObject(config) ? $.extend(true, {}, defaults, config) : defaults;
        $('form[name=story_create]').dialog(dialog_config);
        $(window).unbind('keypress').keypress(function (e) {
            if ( e.which === 13 ) {
                e.preventDefault();
                return submit_f();
            }
        });
    },
	addElement			    : function (el) {
        // add an element to the DOM
		if(el) {
			if(el instanceof Opinion) { el.container.call(el).addToDOM.call(el); }
            else if (el.addToDOM && $.isFunction(el.addToDOM)) { el.addToDOM.call(el, this.options.container_id); }
		}
		// add all elements to the DOM
		else {
            var _DC = this;
			$.each(this.elems, function (id, el) {
				_DC.addElement(el);
			});
		}
        return this;
	},
    setEventHandlers    : function (el) {
        if(el && el.DOMid) {
            var _DC = this;
            if(el.hover && $.isFunction(el.hover)) {
                el.$element.hover(
                    function () {
                        if(el.config.state.drag) { return; }
                        else { el.hover.call(el, _DC.ctx); }
                    },
                    function () {
                        if(el.config.state.drag) { return; }
                        else { el.unhover.call(el, _DC.ctx); }
                    }
                );
            }
            if (this.options.user_permissions && this.options.user_permissions === 'allowed') {
                // attach the event to all elements, no need to add children because of bubbling
                el.$element.mousedown(function (e) {
                    var event = e;
                    if(_DC.click) {
                        // if this is a click on the context menu on a Story
                        if(_DC.click instanceof Story && $(event.target).parents('ul').length) {
                            if($(event.target).parents('ul')[0].id === _DC.menu[0].id) {
                                _DC.click = null;
                                $(event.target).mousedown();
                                if(event.which === 3) {
                                    $(this)[0].oncontextmenu = function () {
                                        return false;
                                    }
                                }
                                return false;
                            }
                        } else {
                            _DC.click = null;
                            _DC.menu.close.call(_DC.menu);
                        }
                    }
                    $(this).mouseup(function () {
                        event.stopPropagation();
                        $(this).unbind('mouseup');
                        if(el.click && $.isFunction(el.click)) {
                            // if this is a right click > start rolling
                            if(event.which === 3) {
                                _DC.click = el;
                                _DC.menu.pop.call(_DC.menu, el.click.call(el, event), _DC);
                            }
                            $(this)[0].oncontextmenu = function () {
                                return false;
                            }
                        }
                    });
                });
            }
        }
    },
    getClickConfig          : function (event) {
        var position = $.clickOffset(event),
            _DC = this,
            config = {
            actions : {
                add_story : function () {
                    _DC.click = null;
                    _DC.getCreateStoryForm(event).dialog('open');
                }
            },
            position: position
        };
        return config;
    },
    getCreateStoryForm      : function (event, speech_act) {
        var form = $('form[name=story_create]');
        var input = $('input[name=speech_act]', form);
        if (event) {
            var offset = $.clickOffset(event),
            y = offset.top,
            x = offset.left;
            $('.'+this.options.speech_container_class).each( function () {
                var $this = $(this),
                    this_left = $this.position().left;
                if(x > this_left && x <= this_left+$this.outerWidth() ) {
                    speech_act = $this.attr('pk');
                }
            });
        }
        if (this.options.discussion) {
            form.append('<input type="hidden" name="discussion" value="'+this.options.discussion+'" />');
            form.append('<input type="hidden" name="group" value="'+this.options.group+'" />');
        }
        if( ! input.length ) {
            form.append('<input type="hidden" name="speech_act" value="'+speech_act+'" />');
        } else {
            input.val(speech_act);
        }
        if (x) {
            // add initial position
            form.append('<input type="hidden" name="x" value="'+x+'" />' +
                        '<input type="hidden" name="y" value="'+y+'" />');
        } else {
            // add initial position
            form.append('<input type="hidden" name="x" value="0" />' +
                        '<input type="hidden" name="y" value="0" />');
        }
        return form;
    },
    getCreateOpinionForm    : function () {
        var form = $('form[name=opinion_create]'),
            parent_id = this.click.config.id,
            parent_class = this.click.config.alias,
            class_input = $('input[name=parent_class]', form),
            parent_input = $('input[name=parent_story]', form);
        switch(parent_class) {
            case 'relation':
                parent_class = 3;
                break;
            case 'story':
            default:
                parent_class = 1;
                break;
        }
//        form.append('<input type="hidden" name="discussion" value="'+this.options.discussion+'" />');
        form.append('<input type="hidden" name="group" value="'+this.options.group+'" />');
        if( ! (class_input.length > 0)) {
            form.append('<input type="hidden" name="parent_class" value="'+parent_class+'" />');
        } else {
            class_input.val(parent_class);
        }
        if( ! (parent_input.length > 0)) {
            parent_input.append('<input type="hidden" name="parent_class" value="'+parent_id+'" />');
        } else {
            parent_input.val(parent_id);
        }
        return form;
    },
    getAllowedRelatedToList : function () {
        var type = this.click.config.type,
            ordinal,
            allowed_type = null,
            list = [];
        // set the ordinal to the next column's
        $.each(this.metaData, function (i, item) {
            if(item.fields.name == type) {
                ordinal = item.fields.ordinal+1;
                return false; // break
            }
        });
        // get the type name of that column
        $.each(this.metaData, function (i, item) {
            if(item.fields.ordinal == ordinal) {
                allowed_type = item.fields.name;
                return false; // break
            }
        });
        // create a list of the stories of that type
        if(allowed_type) {
            $.each(this.elems, function (id, el) {
                if(el.config.type && el.config.type == allowed_type) {
                    list.push(el);
                }
            });
        }
        return (allowed_type && list.length > 0) ? list : false;
    },
    getCreateRelationForm   : function () {
        var form = $('form[name=relation_create]'),
            from_story = this.click.config.id,
            to_stories = this.getAllowedRelatedToList(),
            from_input = $('input[name=from_story]', form),
            to_input = $('select', form),
            options = [],
            i = 0;
        form.append('<input type="hidden" name="discussion" value="'+this.options.discussion+'" />');
        form.append('<input type="hidden" name="group" value="'+this.options.group+'" />');
        if( ! (from_input.length > 0) ) {
            form.append('<input type="hidden" name="from_story" value="'+from_story+'" />');
        } else {
            from_input.val(from_story);
        }
        if( to_input.length && to_stories) {
            $.each(to_stories, function (n, el) {
                options[i++] = '<option value="';
                options[i++] = el.config.id;
                options[i++] = '">';
                options[i++] = el.toString();
                options[i++] = '</option>';
            });
            to_input.html(options.join(''));
        }
        return to_stories ? form : false;
    },
	drawText			    : function (text,x,y,maxWidth,rotation) {
        // if text is short enough - put it in 1 line. if not, search for the middle space, and split it there (only splits to 2 lines).
        this.ctx.translate(x,y);
        this.ctx.save();
        this.ctx.rotate(rotation);
        if (this.ctx.measureText(text).width <= maxWidth*0.8){
            this.ctx.fillText(text,0,0);
        } else {
            var spl = text.split('-');
            var len = Math.floor(spl.length/2);
            var pos = 0;
            for (var i=0; i<len; i++){
                pos = text.indexOf('-',pos)+1;
            }
            var text1 = text.substring(0,pos);
            var text2 = text.substring(pos);
            this.ctx.fillText(text1,0,-10);
            this.ctx.fillText(text2,0,+10);
        }
        this.ctx.restore();
        this.ctx.translate(-x,-y);
    }
};

/*
 *  Class FormController
 *
 * Note on Validation :
 *
 * Each field that should be validated will be
 * added a class with the value of the name of
 * the requested validation function.break
 * e.g.:
 * this input:
 * <input type="text" class="is_value" />
 * will be checked that it is not empty.
 */
var FormController = function() {
	this.f_html		= null;
	this.f_jq		= null;
	this.options	= {};
	this.elements	= {};
    this.error      = false;
};
FormController.prototype = {
	/**
	 * gets an object that maps form name to a config object
	 * iterates over the object and adds the submit event
	 * listener to every form
	 * @param  Object   configs : a map of { name : config }
	 */
	bind				: function (configs) {
		var this_ = this;
		$.each(configs, function(name, config){
			var form = $('form[name='+name+']');
            if(form.length) {
                $(':button[type=submit],:input[type=submit]', form).bind('click', function(e){
                    if($(e.target).attr('name').length && $(e.target).attr('name') == 'action') {
                        $.extend(config, { action : $(e.target).val() });
                    };
                    return this_.submit.call(this_, form[0], config);
                });
            }
		});
	},
	init				: function (form, options) {
		var this_ = this;
        this.f_html		= form || {};
		this.f_jq		= $(form) || {};
		this.options	= $.extend(true, {
	        validation	    : {},
			url			    : this.f_jq.attr('action') || '/',
	        type		    : this.f_jq.attr('method') || 'POST',
	        dont_post	    : false,
	        data_type	    : 'text',
            reset_after_send: true,
            callback        : null,
            error_callback  : null,
	        editor		    : {}
	    }, options || {});
		this.elements = {};
		if(this.f_html.elements) {
			$.each(this.f_html.elements, function (i, el) {
				if($(el).attr('name')) {
					this_.elements[$(el).attr('name')] = el;
				}
			});
		}
	},
	validate			: function () {
		var valid = true;
		this.extractValidation();
		if(this.options.validation && typeof this.options.validation != 'undefined') {
			var this_ = this;
			$.each(this.options.validation, function(field, method){
				var _checked = false;
                // first check that there's a field with this name and that it's not disabled
				if(this_.elements[field] != null && !this_.elements[field].disabled) {
					try {
						if(this_[method] && $.isFunction(this_[method])) {
							if(!this_[method].call(this_, field)) {
								this_.alert_field.call(this_, field);
								valid = false;
							} else {
								this_.clear_alert.call(this_, field);
							}
						}
					} catch(e){alert(e);}
				} else if(this_.elements[field+'[]'] != null && !this_.elements[field+'[]'].disabled) {
					try {
						/*
						 * in case there's a specification for a validation of checkboxes
						 * run an 'OR' test to verify that at least one is checked
						 */
						$.each(this_.elements[field+'[]'], function(index, box){
							_checked = _checked || box.checked;
						});
						valid = _checked;
					} catch(e){alert(e);}
				}
			});
		} else {
			valid = false;
			throw new Error("Form's validation map is missing.");
		}
		return valid;
	},
	/**
	 * the function that is called on the onsubmit event fire
	 * of the form object
	 * @return Boolean false : !! must return false to prevent from redirect to the action url
	 */
	submit				: function (form, options) {
        this.init(form, options);
        if(this.validate()) {
			if(this.before()) {
				if(this.options.dont_post) {
					this.after(this.f_jq.serialize());
				} else {
					this.send();
				}
			}
		}
		return false;
	},
	/**
	 * handles the ajax request
	 * @return Object response : the server's response
	 */
	send				: function () {
		var this_ = this;
		$.ajax({
			type	: this_.options.type,
			url		: this_.options.url,
			data	: this_.f_jq.serialize(),
			dataType: this_.options.data_type,
			success	: function (response) {
                this_.after.call(this_, response);
			},
            error   : function (XMLHttpRequest, textStatus, errorThrown) {
                this_.error = true;
                this_.after.call(this_, XMLHttpRequest.responseText);
            }
		});
	},
	/**
	 * a handler for pre ajax request logic
	 * @return Boolean continue : whether to continue to send
	 */
	before				: function () {
		// enable catching form's multiple submit and passing it to send
		if(this.options.action != null && this.options.action != '') {
			this.options.url = this.options.url + this.options.action;
		}
		return true;
	},
	/**
	 * a handler for ajax response logic and calling callbacks
	 * @return Object
	 */
	after				: function (response) {
        var o = this.options;
        if(!this.error) {
            if(o.reset_after_send) {
                try {
                    $('button', '.ui-dialog-buttonset').removeAttr('disabled'); this.f_jq.dialog('close');
                } catch (ex) {}
                this.f_html.reset();
            }
            if(o.callback && typeof o.callback === 'function') {
                o.callback(response);
            }
        } else {
            this.error = false;
            if(o.error_callback && typeof o.error_callback === 'function') {
                o.error_callback(response);
            }
        }
	},
	extractValidation	: function () {
		var additional_validation = {};
		$.each(this.elements, function (el_name, el) {
			// disabled fields are not counted
			if(!el.disabled) {
				var classes = $(el).attr('class').split(' ');
				$.each(classes, function (i, _class) {
					// allowing one check per field
					if(_class && _class.indexOf('is_') === 0) {
						additional_validation[el_name] = _class;
					}
				});
			}
		});
		$.extend(this.options.validation, additional_validation);
	},
	alert_field			: function (el_name) {
		$(this.elements[el_name]).addClass('field_alert');
        alert(el_name + " can't be empty!")
	},
	clear_alert			: function (el_name) {
		$(this.elements[el_name]).removeClass('field_alert');
	},
	/*
	 * validation functions :
	 */
	is_value			: function (el_name) {
		var val = $(this.elements[el_name]).val();
		return val && $.trim(val) != '' && typeof val != 'undefined';
	},
	is_alpha			: function (el_name) {
		return this._validate($(this.elements[el_name]), /[^a-zA-Z\s_-]/g);
	},
	is_numeric			: function (el_name) {
		return this._validate($(this.elements[el_name]), /[\D]/g);
	},
	is_alphanumeric		: function (el_name) {
		return this._validate($(this.elements[el_name]), /[^\w\s-]/g);
	},
	_validate			: function (el, pat ){
		return this.is_value(el.attr('name')) ? !pat.test(el.val()) : false;
	}
};
var CreateRelationFormController = function (BaseFormController, options) {
    // init the parent
    BaseFormController.init($('form[name="relation_create"]')[0], options);
    // make this the extended of FormController
    $.extend(true, this, BaseFormController, this);

    this.clean_container = $('.'+this.options.clean_title_container_class, this.f_jq);
    this.title_field = $('input[name=title]', this.f_jq);

    // initialize
    this.setCleanTitle().bindChange();
};
CreateRelationFormController.prototype = {
    isClean        : function () {
        var title = $.trim(this.title_field.val()),
            clean = this.clean_container.text();
        return ( title === clean );
    },
    setCleanTitle  : function () {
        var text, to_story_name = $.trim($('select[name="to_story"] option:selected').text());
        text = 'Relation from '+this.options.from_story_title+' to '+to_story_name;
        this.clean_container.text(text);
        this.title_field.val(text);
        return this;
    },
    bindChange     : function () {
        var that = this;
        $('select[name="to_story"]').bind('change', function () {
            if ( that.isClean() ) {
                that.setCleanTitle();
            } else {
                $(this).unbind('change', arguments.callee);
            }
        });
    }
};
var CreateOpinionFormController = function (BaseFormController, options) {
    // init the parent
    BaseFormController.init($('form[name="opinion_create"]')[0], options);
     // make this the extended of FormController
    $.extend(true, this, BaseFormController, this);

    this.clean_container = $('.'+this.options.clean_title_container_class, this.f_jq);
    this.title_field = $('input[name=title]', this.f_jq);

    // initialize
    this.setCleanTitle().bindChange();
};
CreateOpinionFormController.prototype = {
    isClean        : function () {
        var title = $.trim(this.title_field.val()),
            clean = this.clean_container.text();
        return ( title === clean );
    },
    setCleanTitle  : function () {
        var input = $('input[name="speech_act"]:checked'),
            text,
            speech_act_name = $.trim(input.next('label').text()),
            user_name = input.attr('user_name');
        text = user_name + ' says ' + this.options.parent_story_title + ' is ' + speech_act_name;
        this.clean_container.text(text);
        this.title_field.val(text);
        return this;
    },
    bindChange     : function () {
        var that = this;
        $('input[name="speech_act"]').bind('change', function () {
            if ( that.isClean() ) {
                that.setCleanTitle();
            } else {
                $(this).unbind('change', arguments.callee);
            }
        });
    }
};