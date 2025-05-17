'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  icon = '🏃‍♂️';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  icon = '🚴‍♀️';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class Swimming extends Workout {
  type = 'swimming';
  icon = '🏊‍♂️';

  constructor(coords, distance, duration, strokes) {
    super(coords, distance, duration);
    this.strokes = strokes;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Hiking extends Workout {
  type = 'hiking';
  icon = '🥾';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const inputStrokes = document.querySelector('.form__input--strokes');
const btnCloseForm = document.querySelector('.btn--close-form');
const btnLocate = document.querySelector('.btn--locate');
const btnShowAll = document.querySelector('.btn--show-all');
const btnImport = document.querySelector('.btn--import');
const btnExport = document.querySelector('.btn--export');
const btnReset = document.querySelector('.btn--reset');
const importFile = document.getElementById('import-file');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #userLocationMarker = null;
  #accuracyCircle = null;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btnCloseForm.addEventListener('click', this._hideForm.bind(this));
    btnLocate.addEventListener('click', this._locateUser.bind(this));
    btnShowAll.addEventListener('click', this._showAllWorkouts.bind(this));
    btnImport.addEventListener('click', () => importFile.click());
    btnExport.addEventListener('click', this._exportWorkouts.bind(this));
    btnReset.addEventListener('click', this.reset.bind(this));
    importFile.addEventListener('change', this._importWorkouts.bind(this));

    // Initialize stats and sort
    this._updateStats();
    this._renderSortControls();
  }

 _locateUser() {
    if (!this.#map) return;

    // Add active class to button
    btnLocate.classList.add('active');
    
    // Remove active class after 2 seconds
    setTimeout(() => btnLocate.classList.remove('active'), 2000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          
          // Create a marker for user's location
          if (this.#userLocationMarker) {
            this.#map.removeLayer(this.#userLocationMarker);
          }
          
          this.#userLocationMarker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: 'user-location-marker',
              html: '<i class="fas fa-user"></i>',
              iconSize: [30, 30]
            })
          }).addTo(this.#map);
          
          // Center map on user's location with animation
          this.#map.setView([latitude, longitude], this.#mapZoomLevel, {
            animate: true,
            pan: {
              duration: 1,
            },
          });

          // Add a circle to show accuracy
          if (this.#accuracyCircle) {
            this.#map.removeLayer(this.#accuracyCircle);
          }
          
          this.#accuracyCircle = L.circle([latitude, longitude], {
            radius: position.coords.accuracy,
            color: '#136aec',
            fillColor: '#136aec',
            fillOpacity: 0.15,
            weight: 1
          }).addTo(this.#map);
        },
        error => {
          btnLocate.classList.remove('active');
          let errorMessage;
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access was denied. Please enable location services in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "The request to get your location timed out.";
              break;
            case error.UNKNOWN_ERROR:
              errorMessage = "An unknown error occurred while getting your location.";
              break;
          }
          alert(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      btnLocate.classList.remove('active');
      alert("Geolocation is not supported by your browser");
    }
  }  

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Add satellite layer option
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      }
    );

    const baseLayers = {
      'Street Map': L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      ),
      'Satellite View': satelliteLayer,
    };

    L.control.layers(baseLayers).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Render existing workouts
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
      inputStrokes.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
    delete form.dataset.editingId;
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputStrokes.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // Helper functions
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Check if editing existing workout
    const editingId = form.dataset.editingId;
    if (editingId) {
      const index = this.#workouts.findIndex(work => work.id === editingId);
      if (index !== -1) {
        // Remove old workout
        this.#workouts.splice(index, 1);
        // Remove old marker
        const markerIndex = this.#markers.findIndex(
          m => m.workoutId === editingId
        );
        if (markerIndex !== -1) {
          this.#map.removeLayer(this.#markers[markerIndex].marker);
          this.#markers.splice(markerIndex, 1);
        }
        // Remove old DOM element
        document.querySelector(`.workout[data-id="${editingId}"]`)?.remove();
      }
    }

    // Create workout based on type
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling' || type === 'hiking') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      if (type === 'cycling') {
        workout = new Cycling([lat, lng], distance, duration, elevation);
      } else {
        workout = new Hiking([lat, lng], distance, duration, elevation);
      }
    }

    if (type === 'swimming') {
      const strokes = +inputStrokes.value;
      if (
        !validInputs(distance, duration, strokes) ||
        !allPositive(distance, duration, strokes)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Swimming([lat, lng], distance, duration, strokes);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Update stats
    this._updateStats();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.icon} ${workout.description}`
      )
      .openPopup();

    this.#markers.push({
      workoutId: workout.id,
      marker: marker,
    });
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class="workout__header">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__actions">
            <button class="workout__edit" title="Edit workout">
              <i class="fas fa-edit"></i>
            </button>
            <button class="workout__delete" title="Delete workout">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
        <div class="workout__details">
          <div class="workout__detail">
            <span class="workout__icon">${workout.icon}</span>
            <span class="workout__value">${workout.distance.toFixed(1)}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__detail">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__detail">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__detail">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling' || workout.type === 'hiking') {
      html += `
          <div class="workout__detail">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__detail">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </div>
      </li>
      `;
    }

    if (workout.type === 'swimming') {
      html += `
          <div class="workout__detail">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__detail">
            <span class="workout__icon">🏊‍♂️</span>
            <span class="workout__value">${workout.strokes}</span>
            <span class="workout__unit">strokes/min</span>
          </div>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);

    // Add event listeners to edit and delete buttons
    const workoutEl = form.nextElementSibling;
    workoutEl
      .querySelector('.workout__edit')
      .addEventListener('click', e => {
        e.stopPropagation();
        this._editWorkout(workout);
      });
    workoutEl
      .querySelector('.workout__delete')
      .addEventListener('click', e => {
        e.stopPropagation();
        this._deleteWorkout(workout.id);
      });
  }

  _editWorkout(workout) {
    // Show form
    form.classList.remove('hidden');
    form.style.display = 'grid';
    
    // Fill form with workout data
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    
    // Toggle fields based on type
    this._toggleElevationField();
    
    // Fill type-specific fields
    if (workout.type === 'running') inputCadence.value = workout.cadence;
    if (workout.type === 'cycling' || workout.type === 'hiking') {
      inputElevation.value = workout.elevationGain;
    }
    if (workout.type === 'swimming') inputStrokes.value = workout.strokes;
    
    // Store the workout ID being edited
    form.dataset.editingId = workout.id;
    
    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
  }

  _deleteWorkout(id) {
    if (!confirm('Are you sure you want to delete this workout?')) return;
    
    // Remove from array
    this.#workouts = this.#workouts.filter(work => work.id !== id);
    
    // Remove from DOM
    document.querySelector(`.workout[data-id="${id}"]`)?.remove();
    
    // Remove marker from map
    const markerIndex = this.#markers.findIndex(m => m.workoutId === id);
    if (markerIndex !== -1) {
      this.#map.removeLayer(this.#markers[markerIndex].marker);
      this.#markers.splice(markerIndex, 1);
    }
    
    // Update stats
    this._updateStats();
    
    // Update local storage
    this._setLocalStorage();
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _locateUser() {
    if (!this.#map) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          this.#map.setView([latitude, longitude], this.#mapZoomLevel, {
            animate: true,
            pan: {
              duration: 1,
            },
          });
        },
        () => {
          alert('Could not get your current position');
        }
      );
    }
  }

  _showAllWorkouts() {
    if (!this.#map || this.#workouts.length === 0) return;
    
    const coords = this.#workouts.map(workout => workout.coords);
    const bounds = L.latLngBounds(coords);
    this.#map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 14,
    });
  }

  _updateStats() {
    if (this.#workouts.length === 0) {
      document.querySelector('.stats__grid').innerHTML = `
        <div class="stats__item" style="grid-column: 1 / -1;">
          <span class="stats__value">No workouts yet</span>
          <span class="stats__label">Click on the map to add one!</span>
        </div>
      `;
      return;
    }

    const totalDistance = this.#workouts.reduce(
      (sum, workout) => sum + workout.distance,
      0
    );
    const totalDuration = this.#workouts.reduce(
      (sum, workout) => sum + workout.duration,
      0
    );

    const typeCounts = {
      running: this.#workouts.filter(w => w.type === 'running').length,
      cycling: this.#workouts.filter(w => w.type === 'cycling').length,
      swimming: this.#workouts.filter(w => w.type === 'swimming').length,
      hiking: this.#workouts.filter(w => w.type === 'hiking').length,
    };

    document.querySelector('.stats__grid').innerHTML = `
      <div class="stats__item">
        <span class="stats__value">${this.#workouts.length}</span>
        <span class="stats__label">Total Workouts</span>
      </div>
      <div class="stats__item">
        <span class="stats__value">${totalDistance.toFixed(1)}</span>
        <span class="stats__label">Total Distance (km)</span>
      </div>
      <div class="stats__item">
        <span class="stats__value">${totalDuration}</span>
        <span class="stats__label">Total Duration (min)</span>
      </div>
      <div class="stats__item">
        <span class="stats__value">${typeCounts.running}</span>
        <span class="stats__label">Running</span>
      </div>
      <div class="stats__item">
        <span class="stats__value">${typeCounts.cycling}</span>
        <span class="stats__label">Cycling</span>
      </div>
      <div class="stats__item">
        <span class="stats__value">${typeCounts.swimming}</span>
        <span class="stats__label">Swimming</span>
      </div>
      <div class="stats__item">
        <span class="stats__value">${typeCounts.hiking}</span>
        <span class="stats__label">Hiking</span>
      </div>
    `;
  }

  _renderSortControls() {
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        this._sortWorkouts(e.target.value);
      });
    }
  }

  _sortWorkouts(sortBy) {
    let sortedWorkouts = [...this.#workouts];
    
    switch(sortBy) {
      case 'date-newest':
        sortedWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'date-oldest':
        sortedWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'distance-high':
        sortedWorkouts.sort((a, b) => b.distance - a.distance);
        break;
      case 'distance-low':
        sortedWorkouts.sort((a, b) => a.distance - b.distance);
        break;
      case 'duration-long':
        sortedWorkouts.sort((a, b) => b.duration - a.duration);
        break;
      case 'duration-short':
        sortedWorkouts.sort((a, b) => a.duration - b.duration);
        break;
    }
    
    // Re-render workouts
    document.querySelectorAll('.workout').forEach(el => el.remove());
    sortedWorkouts.forEach(workout => this._renderWorkout(workout));
  }

  _exportWorkouts() {
    if (this.#workouts.length === 0) {
      alert('No workouts to export!');
      return;
    }
    
    const dataStr = JSON.stringify(this.#workouts, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportName = `fitmapper-workouts-${new Date().toISOString().slice(0, 10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  }

  _importWorkouts(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const importedWorkouts = JSON.parse(event.target.result);
        
        if (!Array.isArray(importedWorkouts)) {
          throw new Error('Invalid file format');
        }
        
        // Clear current workouts
        this.#workouts = [];
        this.#markers.forEach(marker => this.#map.removeLayer(marker.marker));
        this.#markers = [];
        document.querySelectorAll('.workout').forEach(el => el.remove());
        
        // Process imported workouts
        importedWorkouts.forEach(workoutData => {
          let workout;
          const { type, coords, distance, duration } = workoutData;
          
          switch(type) {
            case 'running':
              workout = new Running(coords, distance, duration, workoutData.cadence);
              break;
            case 'cycling':
              workout = new Cycling(coords, distance, duration, workoutData.elevationGain);
              break;
            case 'swimming':
              workout = new Swimming(coords, distance, duration, workoutData.strokes);
              break;
            case 'hiking':
              workout = new Hiking(coords, distance, duration, workoutData.elevationGain);
              break;
            default:
              console.warn(`Unknown workout type: ${type}`);
              return;
          }
          
          // Preserve original date and ID if available
          if (workoutData.date) workout.date = new Date(workoutData.date);
          if (workoutData.id) workout.id = workoutData.id;
          
          this.#workouts.push(workout);
          this._renderWorkoutMarker(workout);
          this._renderWorkout(workout);
        });
        
        this._updateStats();
        this._setLocalStorage();
        alert(`Successfully imported ${importedWorkouts.length} workouts!`);
        
      } catch (error) {
        console.error('Error importing workouts:', error);
        alert('Error importing workouts. Please check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // Recreate workout objects from localStorage data
    this.#workouts = data.map(workoutData => {
      let workout;
      const { type, coords, distance, duration } = workoutData;
      
      switch(type) {
        case 'running':
          workout = new Running(coords, distance, duration, workoutData.cadence);
          break;
        case 'cycling':
          workout = new Cycling(coords, distance, duration, workoutData.elevationGain);
          break;
        case 'swimming':
          workout = new Swimming(coords, distance, duration, workoutData.strokes);
          break;
        case 'hiking':
          workout = new Hiking(coords, distance, duration, workoutData.elevationGain);
          break;
      }
      
      // Restore additional properties
      if (workoutData.date) workout.date = new Date(workoutData.date);
      if (workoutData.id) workout.id = workoutData.id;
      if (workoutData.clicks) workout.clicks = workoutData.clicks;
      if (workoutData.description) workout.description = workoutData.description;
      
      return workout;
    });

    // Render workouts after map loads
  }

  reset() {
    if (confirm('Are you sure you want to delete ALL workouts?')) {
      localStorage.removeItem('workouts');
      location.reload();
    }
  }
}

const app = new App();