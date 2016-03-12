( function () {

	'use strict';

	/**
	 * Skeleton panorama derived from THREE.Mesh
	 * @constructor
	 * @param {THREE.Geometry} geometry - The geometry for this panorama
	 * @param {THREE.Material} material - The material for this panorama
	 */
	PANOLENS.Panorama = function ( geometry, material ) {

		THREE.Mesh.call( this );

		this.type = 'panorama';

		this.ImageQualityLow = 1;
		this.ImageQualityFair = 2;
		this.ImageQualityMedium = 3;
		this.ImageQualityHigh = 4;
		this.ImageQualitySuperHigh = 5;

		this.animationDuration = 500;

		this.defaultInfospotSize = 350;

		this.loaded = false;

		this.linkedSpots = [];

		this.isChildrenVisible = false;
		
		this.linkingImageURL = undefined;
		this.linkingImageScale = undefined;

		this.geometry = geometry;

		this.material = material;
		this.material.side = THREE.DoubleSide;
		this.material.visible = false;

		this.scale.x *= -1;

		this.orbitRadius = ( geometry.parameter && geometry.parameter.radius ) 
			? geometry.parameter.radius
			: 100;

		this.addEventListener( 'load', this.fadeIn.bind( this ) );

	}

	PANOLENS.Panorama.prototype = Object.create( THREE.Mesh.prototype );

	PANOLENS.Panorama.prototype.constructor = PANOLENS.Panorama;

	PANOLENS.Panorama.prototype.add = function ( object ) {

		var invertedObject;

		if ( arguments.length > 1 ) {

			for ( var i = 0; i < arguments.length; i ++ ) {

				this.add( arguments[ i ] );

			}

			return this;

		}

		// In case of infospots
		if ( object instanceof PANOLENS.Infospot ) {

			invertedObject = object;

		} else {

			// Counter scale.x = -1 effect
			invertedObject = new THREE.Object3D();
			invertedObject.scale.x = -1;
			invertedObject.add( object );

		}

		THREE.Object3D.prototype.add.call( this, invertedObject );

	};

	PANOLENS.Panorama.prototype.load = function () {

		this.onLoad();
		
	};

	PANOLENS.Panorama.prototype.onLoad = function () {

		this.toggleChildrenVisibility( true );

		this.loaded = true;

		this.dispatchEvent( { type: 'load' } );

	};

	PANOLENS.Panorama.prototype.onProgress = function ( progress ) {

		this.dispatchEvent( { type: 'progress', progress: progress } );

	};

	PANOLENS.Panorama.prototype.onError = function () {

		this.dispatchEvent( { type: 'error' } );

	};

	PANOLENS.Panorama.prototype.getZoomLevel = function () {

		var zoomLevel;

		if ( window.innerWidth <= 800 ) {

			zoomLevel = this.ImageQualityFair;

		} else if ( window.innerWidth > 800 &&  window.innerWidth <= 1280 ) {

			zoomLevel = this.ImageQualityMedium;

		} else if ( window.innerWidth > 1280 && window.innerWidth <= 1920 ) {

			zoomLevel = this.ImageQualityHigh;

		} else if ( window.innerWidth > 1920 ) {

			zoomLevel = this.ImageQualitySuperHigh;

		} else {

			zoomLevel = this.ImageQualityLow;

		}

		return zoomLevel;

	};

	PANOLENS.Panorama.prototype.updateTexture = function ( texture ) {

		this.material.map = texture;

		this.material.needsUpdate = true;

	};

	PANOLENS.Panorama.prototype.toggleChildrenVisibility = function ( force, delay ) {

		delay = ( delay !== undefined ) ? delay : 0;

		var scope = this, 
			visible = ( force !== undefined ) ? force : ( this.isChildrenVisible ? false : true );

		this.traverse( function ( object ) {

			if ( object instanceof PANOLENS.Infospot ) {

				visible ? object.show( delay ) : object.hide( delay );

			}

		} );

		this.isChildrenVisible = visible;

	};

	PANOLENS.Panorama.prototype.setLinkingImage = function ( url, scale ) {

		this.linkingImageURL = url;
		this.linkingImageScale = scale;

	};

	PANOLENS.Panorama.prototype.link = function ( pano, ended ) {

		var scope = this, spot, raycaster, intersect, point;

		this.visible = true;

		raycaster = new THREE.Raycaster();
		raycaster.set( this.position, pano.position.clone().sub( this.position ).normalize() );
		intersect = raycaster.intersectObject( this );

		if ( intersect.length > 0 ) {

			point = intersect[ intersect.length - 1 ].point.clone().multiplyScalar( 0.99 );

		} else {

			console.warn( 'Panoramas should be at different position' );
			return;

		}

		spot = new PANOLENS.Infospot( 
			pano.linkingImageScale !== undefined ? pano.linkingImageScale : this.defaultInfospotSize, 
			pano.linkingImageURL !== undefined ? pano.linkingImageURL : PANOLENS.DataImage.Arrow 
		);
        spot.position.copy( point );
        spot.toPanorama = pano;
        spot.addEventListener( 'click', function () {

        	scope.dispatchEvent( { type : 'panolens-viewer-handler', method: 'setPanorama', data: pano } );

        } );

        this.linkedSpots.push( spot );

        this.add( spot );

        this.visible = false;

        if ( !ended ) {

        	pano.link( this, true );

        }

	};

	PANOLENS.Panorama.prototype.reset = function () {

		this.children.length = 0;	

	};

	PANOLENS.Panorama.prototype.fadeIn = function () {

		new TWEEN.Tween( this.material )
		.to( { opacity: 1 }, this.animationDuration )
		.easing( TWEEN.Easing.Quartic.Out )
		.start();

	};

	PANOLENS.Panorama.prototype.fadeOut = function () {

		new TWEEN.Tween( this.material )
		.to( { opacity: 0 }, this.animationDuration )
		.easing( TWEEN.Easing.Quartic.Out )
		.start();

	};

	PANOLENS.Panorama.prototype.onEnter = function () {

		new TWEEN.Tween( this )
		.to( {}, this.animationDuration )
		.easing( TWEEN.Easing.Quartic.Out )
		.onStart( function () {

			this.dispatchEvent( { type: 'enter-start' } );

			if ( this.loaded ) {

				this.fadeIn();
				this.toggleChildrenVisibility( true, this.animationDuration );

			} else {

				this.load();

			}

			this.visible = true;
			this.material.visible = true;
		} )
		.delay( this.animationDuration )
		.start();

		this.dispatchEvent( { type: 'enter' } );

	};

	PANOLENS.Panorama.prototype.onLeave = function () {

		new TWEEN.Tween( this )
		.to( {}, this.animationDuration )
		.easing( TWEEN.Easing.Quartic.Out )
		.onStart( function () {

			this.fadeOut();
			this.toggleChildrenVisibility( false );

		} )
		.onComplete( function () {

			this.visible = false;
			this.material.visible = true;

		} )
		.start();

		this.dispatchEvent( { type: 'leave' } );

	};

} )();