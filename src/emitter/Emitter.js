(function(Proton, undefined) {
	Emitter.ID = 0;
	/**
	 * You can use this emit particles.
	 *
	 * It will dispatch follow events:
	 * Proton.PARTICLE_CREATED
	 * Proton.PARTICLE_UPDATA
	 * Proton.PARTICLE_DEAD
	 *
	 * @class Proton.Emitter
	 * @constructor
	 * @param {Object} pObj the parameters object;
	 * for example {damping:0.01,bindEmitter:false}
	 */
	function Emitter(pObj) {
		this.initializes = [];
		this.particles = [];
		this.behaviours = [];
		this.emitTime = 0;
		this.emitTotalTimes = -1;
		/**
		 * The friction coefficient for all particle emit by This;
		 * @property damping
		 * @type {Number}
		 * @default 0.006
		 */
		this.damping = .006;
		/**
		 * If bindEmitter the particles can bind this emitter's property;
		 * @property bindEmitter
		 * @type {Boolean}
		 * @default true
		 */
		this.bindEmitter = true;
		/**
		 * The number of particles per second emit (a [particle]/b [s]);
		 * @property rate
		 * @type {Proton.Rate}
		 * @default Proton.Rate(1, .1)
		 */
		this.rate = new Proton.Rate(1, .1);
		Emitter._super_.call(this, pObj);
		/**
		 * The emitter's id;
		 * @property id
		 * @type {String} id
		 */
		this.id = 'emitter_' + Emitter.ID++;
	};

	Proton.Util.inherits(Emitter, Proton.Particle);
	Proton.EventDispatcher.initialize(Emitter.prototype);
	/**
	 * start emit particle
	 * @method emit
	 * @param {Number} emitTime begin emit time;
	 * @param {String} life the life of this emitter
	 */
	Emitter.prototype.emit = function(emitTime, life) {
		this.emitTime = 0;
		this.emitTotalTimes = Proton.Util.initValue(emitTime, Infinity);

		if (life == true || life == 'life' || life == 'destroy') {
			if (emitTime == 'once')
				this.life = 1;
			else
				this.life = this.emitTotalTimes;

		} else if (!isNaN(life)) {
			this.life = life;
		}

		this.rate.init();
	};

	/**
	 * stop emiting
	 * @method stopEmit
	 */
	Emitter.prototype.stopEmit = function() {
		this.emitTotalTimes = -1;
		this.emitTime = 0;
	};

	/**
	 * remove current all particles
	 * @method removeAllParticles
	 */
	Emitter.prototype.removeAllParticles = function() {
		for (var i = 0; i < this.particles.length; i++)
			this.particles[i].dead = true;
	};
	/**
	 * create single particle;
	 * 
	 * can use emit({x:10},new Gravity(10),{'particleUpdate',fun}) or emit([{x:10},new Initialize],new Gravity(10),{'particleUpdate',fun})
	 * @method removeAllParticles
	 */
	Emitter.prototype.createParticle = function(initialize, behaviour) {
		var particle = Proton.pool.get(Proton.Particle);
		this.setupParticle(particle, initialize, behaviour);
		this.dispatchEvent(Proton.PARTICLE_CREATED, particle);

		return particle;
	};
	/**
	 * add initialize to this emitter
	 * @method addSelfInitialize
	 */
	Emitter.prototype.addSelfInitialize = function(pObj) {
		if (pObj['init']) {
			pObj.init(this);
		} else {
			this.initAll();
		}
	};
	/**
	 * add the Initialize to particles;
	 * 
	 * you can use initializes array:for example emitter.addInitialize(initialize1,initialize2,initialize3);
	 * @method addInitialize
	 * @param {Proton.Initialize} initialize like this new Proton.Radius(1, 12)
	 */
	Emitter.prototype.addInitialize = function() {
		var length = arguments.length, i;
		for ( i = 0; i < length; i++) {
			this.initializes.push(arguments[i]);
		}
	};
	/**
	 * remove the Initialize
	 * @method removeInitialize
	 * @param {Proton.Initialize} initialize a initialize
	 */
	Emitter.prototype.removeInitialize = function(initializer) {
		var index = this.initializes.indexOf(initializer);
		if (index > -1) {
			this.initializes.splice(index, 1);
		}
	};

	/**
	 * remove all Initializes
	 * @method removeInitializers
	 */
	Emitter.prototype.removeInitializers = function() {
		Proton.Util.destroyArray(this.initializes);
	};
	/**
	 * add the Behaviour to particles;
	 * 
	 * you can use Behaviours array:emitter.addBehaviour(Behaviour1,Behaviour2,Behaviour3);
	 * @method addBehaviour
	 * @param {Proton.Behaviour} behaviour like this new Proton.Color('random')
	 */
	Emitter.prototype.addBehaviour = function() {
		var length = arguments.length, i;
		for ( i = 0; i < length; i++) {
			this.behaviours.push(arguments[i]);
			if (arguments[i].hasOwnProperty("parents"))
				arguments[i].parents.push(this);
		}
	};
	/**
	 * remove the Behaviour
	 * @method removeBehaviour
	 * @param {Proton.Behaviour} behaviour a behaviour
	 */
	Emitter.prototype.removeBehaviour = function(behaviour) {
		var index = this.behaviours.indexOf(behaviour);
		if (index > -1)
			this.behaviours.splice(index, 1);
	};
	/**
	 * remove all behaviours
	 * @method removeAllBehaviours
	 */
	Emitter.prototype.removeAllBehaviours = function() {
		Proton.Util.destroyArray(this.behaviours);
	};

	Emitter.prototype.integrate = function(time) {
		var damping = 1 - this.damping;
		Proton.integrator.integrate(this, time, damping);
		var length = this.particles.length, i;
		for ( i = 0; i < length; i++) {
			var particle = this.particles[i];
			particle.update(time, i);
			Proton.integrator.integrate(particle, time, damping);

			this.dispatchEvent(Proton.PARTICLE_UPDATE, particle);
		}
	};

	Emitter.prototype.emitting = function(time) {
		if (this.emitTotalTimes == 'once') {
			var length = this.rate.getValue(99999), i;
			for ( i = 0; i < length; i++) {
				this.createParticle();
			}

			this.emitTotalTimes = 'none';
		} else if (!isNaN(this.emitTotalTimes)) {
			this.emitTime += time;
			if (this.emitTime < this.emitTotalTimes) {
				var length = this.rate.getValue(time), i;
				for ( i = 0; i < length; i++) {
					this.createParticle();
				}
			}
		}
	}

	Emitter.prototype.update = function(time) {
		this.age += time;
		if (this.age >= this.life || this.dead) {
			this.destroy();
		}

		this.emitting(time);
		this.integrate(time);
		var particle;
		var length = this.particles.length, k;
		for ( k = length - 1; k >= 0; k--) {
			particle = this.particles[k];
			if (particle.dead) {
				this.dispatchEvent(Proton.PARTICLE_DEAD , particle);

				Proton.pool.set(particle);
				this.particles.splice(k, 1);
			}
		}
	};

	Emitter.prototype.setupParticle = function(particle, initialize, behaviour) {
		var initializes = this.initializes;
		var behaviours = this.behaviours;

		if (initialize) {
			if ( initialize instanceof Array)
				initializes = initialize;
			else
				initializes = [initialize];
		}

		if (behaviour) {
			if ( behaviour instanceof Array)
				behaviours = behaviour;
			else
				behaviours = [behaviour];
		}

		particle.reset();
		Proton.InitializeUtil.initialize(this, particle, initializes);
		particle.addBehaviours(behaviours);
		particle.parent = this;
		this.particles.push(particle);
	};

	/**
	 * Destory this Emitter
	 * @method destroy
	 */
	Emitter.prototype.destroy = function() {
		this.dead = true;
		this.emitTotalTimes = -1;
		if (this.particles.length == 0) {
			this.removeInitializers();
			this.removeAllBehaviours();

			if (this.parent)
				this.parent.removeEmitter(this);
		}
	}

	Proton.Emitter = Emitter;
})(Proton);
