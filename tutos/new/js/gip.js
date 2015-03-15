(function() {
	
	// EaselJS
	var Ticker = createjs.Ticker;
	var gipCanvas;				//  canvas easeljs
	var stage;					// stage easeljs
	
	// Box2d Web
	var box2dCanvas; // canvas box2d
	var box2dUtils; // classe utilitaire box2d
	var context; 	// contexte 2d
	var SCALE = 30; // �chelle
	var world;		// world box2d
	var canvasWidth, canvasHeight;	// dimensions du canvas
	
	// Gestion de la souris
	var curr_line = null;
	var isMouseDown = false; // le clic est-il enfonc� ?
	var canvasPosition; // la position du canvas

	var b2Vec2 = Box2D.Common.Math.b2Vec2;
	var b2AABB = Box2D.Collision.b2AABB;
	var b2Body = Box2D.Dynamics.b2Body;
	
	// pigs
	var pigs = [];
	
	var lines = [];

	// debug box2d ?
	var box2dDebug = true;
	
	var player = null, background = null;
	var keys = [];

	// Initialisation
	$(document).ready(function() {
		init();
	});
	
	// Fonction d'initialisation
	this.init = function() {
		prepareStage();		// pr�parer l'environnement graphique
		prepareBox2d();		// pr�parer l'environnement physique
		
		// Graphics
		background = new Background(stage, SCALE);
		
		// Physics
		addLines();
		addPigs();			// ajout d'�l�ments physiques dynamiques (pigs)

		// Cr�er le player
		player = new Player(stage, SCALE);
		player.createPlayer(world, 25, canvasHeight-30, 20);

		// Ajouter le listener de collisions
		addContactListener();

		// Ajouter les listeners d'�v�nements souris	
		window.addEventListener('mousedown', handleMouseDown);
		window.addEventListener('mouseup', handleMouseUp);
		
		// Ajouter les listeners d'�v�nements
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		

		// D�sactiver les scrollings vertical lors d'un appui sur les touches directionnelles "haut" et "bas"
		document.onkeydown = function(event) {
			return event.keyCode != 38 && event.keyCode != 40;
		}

		/// Initialiser bouton
		initBtn();
		
		startTicker(30);	// lancer le ticker
	};
	
	// Pr�parer l'environnement graphique
	this.prepareStage = function() {
		// r�cup�rer le canvas GIP
		gipCanvas = $('#gipCanvas').get(0);
		// cr�er le Stage
		stage = new createjs.Stage(gipCanvas);
		// Classe utilitaire EaselJS
		easelJsUtils = new EaselJsUtils(stage);
	};
	
	// Pr�parer l'environnement physique
	this.prepareBox2d = function() {
		box2dCanvas = $('#box2dCanvas').get(0);
		canvasWidth = parseInt(box2dCanvas.width);
		canvasHeight = parseInt(box2dCanvas.height);
		canvasPosition = $(box2dCanvas).position();
		context = box2dCanvas.getContext('2d');
		box2dUtils = new Box2dUtils(SCALE);
		world = box2dUtils.createWorld(context); // box2DWorld
		setWorldBounds(); // d�finir les limites de l'environnement
	};
	
	// Cr�er les limites de l'environnement
	this.setWorldBounds = function() {
		// Cr�er le "sol" et le "plafond" de notre environnement physique
		ground = box2dUtils.createBox(world, 400, canvasHeight - 10, 400, 10, null, true, 'ground');
		ceiling = box2dUtils.createBox(world, 400, -5, 400, 1, null, true, 'ceiling');
		
		// Cr�er les "murs" de notre environnement physique
		leftWall = box2dUtils.createBox(world, -5, canvasHeight, 1, canvasHeight, null, true, 'leftWall');
		leftWall = box2dUtils.createBox(world, canvasWidth + 5, canvasHeight, 1, canvasHeight, null, true, 'leftWall');
	};

	this.addLines = function() {
		var line = new Line(stage, SCALE, [{x:10,y:15},{x:15,y:20}]);
	};

	// Ajout des cochons
	this.addPigs = function() {
		// Cr�er 30 "Pigs" plac�s al�atoirement dans l'environnement
		for (var i=0; i<5; i++) {
			var pig = box2dUtils.createPig(world, stage, Math.random() * canvasWidth, Math.random() * canvasHeight - 400 / SCALE);
			pigs.push(pig);	// conserver les cochons dans un tableau
		}
	};

	// D�marrer le ticker
	this.startTicker = function(fps) {
		Ticker.setFPS(fps);
		Ticker.addEventListener("tick", tick);
	};
	
	// Mise � jour de l'environnement
	this.tick = function() {
		
		// Mettre � jour les cochons
		for (var i=0; i < pigs.length; i++) {
			pigs[i].update();
		}
		
		// box2d
		world.Step(1 / 15,  10, 10);
		world.DrawDebugData();
		world.ClearForces();

		// g�rer les interactions avec le player
		handleInteractions();
		player.update();	

		// easelJS
		stage.update();
	};

	// appuyer sur une touche
	this.handleKeyDown = function(evt) {
		keys[evt.keyCode] = true;
	}

	// relacher une touche
	this.handleKeyUp = function(evt) {
		keys[evt.keyCode] = false;
	}

	// G�rer les interactions
	this.handleInteractions = function() {
		// touche "haut"
		if (keys[38]) {
			player.jump();
		}
		// touches "gauche" et "droite"
		if (keys[37]) {
			player.moveLeft();
		} else if (keys[39]) {
			player.moveRight();
		}	
	}

	// D�terminer si l'objet physique est le player
	this.isPlayer = function(object) {
		if (object != null && object.GetUserData() != null) {
			return object.GetUserData() == 'player';
		}
	}
	
	// D�terminer si l'objet physique est les pieds du player
	this.isFootPlayer = function(object) {
		if (object != null && object.GetUserData() != null) {
			return object.GetUserData() == 'footPlayer';
		}
	}
	
	// D�terminer si l'objet physique est le sol ou une box
	this.isGroundOrBox = function(object) {
		if (object != null && object.GetUserData() != null) {
			return (object.GetUserData() == 'box'
				 || object.GetUserData() == 'ground' 
				 || object.GetUserData() == 'pig'
				 || object.GetUserData() == 'shortTree');
		}
	}

	this.mouseCoords = function(evt){
		return {
			x: (evt.clientX - canvasPosition.left) / SCALE,
			y: (evt.clientY - canvasPosition.top) / SCALE
		}
	}

	this.handleMouseDown = function(evt) {
		isMouseDown = true;
		var pos = this.mouseCoords(evt);
		curr_line = new Line(stage, SCALE, [pos,pos]);
		handleMouseMove(evt);
		window.addEventListener('mousemove', handleMouseMove);
	}
	
	this.handleMouseUp = function(evt) {
		window.removeEventListener('mousemove', handleMouseMove);
		isMouseDown = false;
	}
	
	this.handleMouseMove = function(evt) {
		curr_line.setEnd(this.mouseCoords(evt));
	}
	
	this.getBodyAtMouse = function() {
		selectedBody = null;
		mouseVec = new b2Vec2(mouseX, mouseY);
		var aabb = new b2AABB();
		aabb.lowerBound.Set(mouseX, mouseY);
		aabb.upperBound.Set(mouseX, mouseY);
		world.QueryAABB(getBodyCallBack, aabb);
		return selectedBody;
	}
	
	// Callback de getBody -> QueryAABB
	this.getBodyCallBack = function(fixture) {
        if (fixture.GetBody().GetType() != b2Body.b2_staticBody) {
            if (fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mouseVec)) {
               selectedBody = fixture.GetBody();
               return false;
            }
        }
        return true;
	}
	
	// Initialisation du bouton de debug
	this.initBtn = function() {
		$('#btnB2d').click(function(){
			box2dDebug = !box2dDebug;
			if (box2dDebug) {
				$(box2dCanvas).css('opacity', 1);
			} else {
				$(box2dCanvas).css('opacity', 0);
			}
		});
	};

	// Ajout du listener sur les collisions
	this.addContactListener = function() {
		var b2Listener = Box2D.Dynamics.b2ContactListener;
		//Add listeners for contact
		var listener = new b2Listener;
		
		// Entr�e en contact
		listener.BeginContact = function(contact) {
			var obj1 = contact.GetFixtureA();
			var obj2 = contact.GetFixtureB();
			if (isFootPlayer(obj1) || isFootPlayer(obj2)) {
				if (isGroundOrBox(obj1) || isGroundOrBox(obj2)) {					
					player.jumpContacts ++;	// le joueur entre en contact avec une plate-forme de saut
				}
			}
		}
		
		// Fin de contact
		listener.EndContact = function(contact) {
			var obj1 = contact.GetFixtureA();
			var obj2 = contact.GetFixtureB();
			if (isFootPlayer(obj1) || isFootPlayer(obj2)) {
				if (isGroundOrBox(obj1) || isGroundOrBox(obj2)) {
					player.jumpContacts --;	// le joueur quitte une plate-forme de saut
				}
			}
		}
		listener.PostSolve = function(contact, impulse) {
			// PostSolve
		}
		listener.PreSolve = function(contact, oldManifold) {
		    // PreSolve
		}
		world.SetContactListener(listener);
	}


}());