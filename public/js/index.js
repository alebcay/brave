//
// This web interface has been quickly thrown together. It's not production code.
//

function global_all_stop () {
  console.log("should stop streaming")
}

function rebuild_mixer_and_output_with_delayed_start () {
  console.log("rebuilding mixer and output")

  //submitCreateOrEdit(blockType, id, values)
}

function add_bitwave_text () {
  const addbwtext = {'type': 'text', 'text': '[bitwave.tv]', 'valignment': 'bottom', 'source': 'mixer1'};
  submitCreateOrEdit('overlay', null, addbwtext)
}

function add_time_overlay () {
  const createTime = {'type': 'clock', 'text': '', 'valignment': 'bottom', 'source': 'mixer1'};
  submitCreateOrEdit('overlay', null, createTime)
}

function qa_streamlink () {
  const url_link = $('#quickaddrebox').val();
  const createsl ={'type': 'streamlink', 'uri': url_link, 'volume': 1, 'loop': false};
  submitCreateOrEdit('input', null, createsl);
  $('#quickaddrebox').val('');
}

function qa_ytdl () {
  const url_link = $('#quickaddrebox').val();
  const createytdl ={'type': 'youtubedl', 'uri': url_link, 'volume': 1, 'loop': false, disablevideo: false};
  submitCreateOrEdit('input', null, createytdl);
  $('#quickaddrebox').val('');
}

function qa_text () {
  const url_link = $('#quickaddrebox').val();
  const createtext ={'type': 'text', 'text': url_link, 'valignment': 'bottom', 'source': 'mixer1'};
  submitCreateOrEdit('input', null, createtext);
  $('#quickaddrebox').val('');
}

function onPageLoad () {
  $(document).ready(function() {
    // Navbar quick add buttons
    $('#nav-add-input').click(inputsHandler.showFormToAdd);
    $('#nav-add-ytdl').click( () => inputsHandler.showFormToAdd({ type: 'youtubedl' } ) );

    $('#new-input-button').click(inputsHandler.showFormToAdd);
    $('#new-mixer-button').click(mixersHandler.create);
    $('#new-overlay-button').click(overlaysHandler.showFormToAdd);
    $('#new-output-button').click(outputsHandler.showFormToAdd);
    $('#refresh-page-button').click(updatePage);
    $('#restart-brave-button').click(restartBraveConfirmation);

    // add special input handlers for rebuild mixer and output
    $('#rebuild-mixer-and-output').click(rebuild_mixer_and_output_with_delayed_start);
    // add bitwave text
    $('#add-bitwave-text').click(add_bitwave_text);

    // add time overlay
    $('#add-time-overlay').click(add_time_overlay);

    // global stop of output
    $('#all-stop').click(global_all_stop);

    // Quicker add
    $('#quick-add-ytdl').click(qa_ytdl);

    // do quick adds for quickaddrebox
    $('#qa-youtubedl').click(qa_ytdl);
    $('#qa-streamlink').click(qa_streamlink);
    $('#qa-text').click(qa_text);

    $("#top-message").hide();
    updatePage();
    websocket.setup()
  })
}

function updatePage () {
  $.ajax({
    url: 'api/all'
  }).then(function(data) {
    inputsHandler.items = data.inputs;
    overlaysHandler.items = data.overlays;
    outputsHandler.items = data.outputs;
    mixersHandler.items = data.mixers;
    drawAllItems()
  });
}

setInterval (updatePage, 5000);

function drawAllItems () {
  $('#cards').empty();
  if (noItems()) return showNoItemsMessage();
  inputsHandler.draw();
  overlaysHandler.draw();
  mixersHandler.draw();
  outputsHandler.draw()
}

$('.toast').toast();

const toastHolder = $('#toast-holder');

const toastTemplate = ( title, message ) => `
<div class="toast text-white" role="alert" aria-live="assertive" aria-atomic="true">
  <div class="toast-header">
    <strong class="mr-auto">${title}</strong>
    <small class="text-muted">Just now</small>
    <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
        <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="toast-body">${message}</div>
</div>
`;

const createToast = ( title, message, type ) => {
  const toast = $(`<div></div>`)
    .append( toastTemplate( title, message ) )
    .find( '.toast' );
  toast.addClass(`bg-${type}`);
  toastHolder.append( toast );
  return toast;
};

function showMessage ( m, level ) {
  const VALID_LEVELS = [ 'warning', 'success', 'danger', 'info' ];
  if ( !level || VALID_LEVELS.indexOf( level ) === -1 ) level = 'warning';
  const toast = createToast( level, m, level );
  toast.toast( { delay: 4000 } );
  toast.toast( 'show' );
  setTimeout( () => toast.remove(), 5000 );
}

function hideMessage () {
  $('.toast').dispose();
}

function getSelect ( name, currentlySelectedKey, msg, options, alwaysShowUnselectedOption ) {
  const h = $('<select name="' + name + '"></select>');
  h.addClass( 'form-control form-control-sm' );
  if ( !currentlySelectedKey || alwaysShowUnselectedOption ) $( h ).append( '<option value="">' + msg + '</option>' );
  Object.keys( options ).forEach( function( key) {
    const option = $( '<option></option>' );
    option.attr({ 'value': key }).text( options[ key ] );
    if ( key === currentlySelectedKey ) option.attr({ selected: 'selected' });
    $( h ).append( option )
  });

  return h;
}

function getDimensionsSelect ( name, width, height ) {
  const currentDimensions = width && height ? width + 'x' + height : null;
  const dimensionsOptions = {};
  dimensionsOptions[currentDimensions] = prettyDimensions({width: width, height: height});
  standardDimensions.forEach(d => {
    const dimensions = d[0] + 'x' + d[1];
    dimensionsOptions[dimensions] = prettyDimensions({width: d[0], height: d[1]})
  });

  return formGroup({
    id: 'input-dimensions',
    label: 'Dimensions',
    name,
    value: currentDimensions,
    initialOption: 'None (automatically resize to full screen)',
    options: dimensionsOptions,
    alwaysShowUnselectedOption: true
  })
}

function getSourceSelect (block, isNew) {
  const options = {
    id: 'source',
    label: 'Source',
    name: 'source',
    options: {'none': 'None'},
  };

  options.value = block.source;

  mixersHandler.items.concat(inputsHandler.items).forEach(m => {
    options.options[m.uid] = prettyUid(m.uid);

    // If creating new, make the first mixer the default one:
    if (isNew && !options.value) options.value = m.uid
  });

  if (!options.value) options.value = 'none';
  return formGroup(options)
}

function splitXyString (s) {
  const matches = s.match(/^(\d+)x(\d+)$/);
  if (matches) return [matches[1], matches[2]]
}

function splitPositionIntoXposAndYpos (obj) {
  if (obj.position) {
    const split = splitXyString(obj.position);
    if (split) [obj.xpos, obj.ypos] = split;
    else {
      showMessage('Cannot understand position', 'warning');
      return false
    }
  }
  delete obj.position; // also deletes if empty string
  return true
}

function splitDimensionsIntoWidthAndHeight (obj) {
  if (obj.dimensions) {
    split = splitXyString(obj.dimensions);
    if (split) [obj.width, obj.height] = split;
    else {
      showMessage('Cannot understand dimensions', 'warning');
      return false
    }
  }
  delete obj.dimensions; // also deletes if empty string
  return true
}

// Widescreen, selectively taken from https://en.wikipedia.org/wiki/16:9#Common_resolutions
const standardDimensions = [
  [254, 144],
  [480, 270],
  [640, 360],
  [768, 432],
  [1024, 576],
  [1280, 720],
  [1366, 768],

  // // Portrait
  // [360, 640],
  // [720, 1280],
  //
  // // Square
  // [360, 360],
  // [640, 640],
  // [1080, 1080],
  //
  // // 4:3
  // [640, 480],
  // [704, 576],
];

function prettyDimensions (obj) {
  let str = obj.width + 'x' + obj.height;
  if (obj.width*(9/16) === obj.height) {
    str += ' (16x9 landscape)'
  }
  else if (obj.width*(16/9) === obj.height) {
    str += ' (16x9 portrait)'
  }
  else if (obj.width*(3/4) === obj.height) {
    str += ' (4x3 landscape)'
  }
  else if (obj.width === obj.height) {
    str += ' (square)'
  }

  if (obj.width === 720 && obj.height === 576) str += ' (PAL DVD)';
  if (obj.width === 1280 && obj.height === 720) str += ' (720p HD)';
  if (obj.width === 1920 && obj.height === 1080) str += ' (1080p Full HD)';
  if (obj.width === 576 && obj.height === 520) str += ' (PAL SD)';
  if (obj.width === 1024 && obj.height === 576) str += ' (Widescreen SD)';
  if (obj.width === 1366 && obj.height === 768) str += ' (qHD)';
  return str
}

function prettyType (i) {
  i = i.replace(/_/g, ' ');
  // i = i.replace(/./, i.toUpperCase()[0])
  return i
}

// Creates part of a form, which Bootstrap calls a 'form-group'
function formGroup (details) {
  const e = $(document.createElement('div'));
  e.addClass('form-group');
  const label = $(document.createElement('label'));
  label.html(details.label);
  label.attr('for', details.id);

  if ( details.type === 'checkbox' ) {
    const input = $('<input type="checkbox" />');
    input.attr('id', details.id);
    input.attr('name', details.name);
    if (details.value) input.attr('checked', 'checked');
    if (e.value) input.checked = true;
    e.append(input, ' ', label)
  }

  else if ( details.options ) {
    e.append(label);
    const s = getSelect( details.name, details.value, details.initialOption, details.options, details.alwaysShowUnselectedOption );
    e.append(s)
  }

  else if ( details.type === 'range' ) {
    const input = $( document.createElement( 'input' ) );
    const msg   = $( '<span></span>' );

    msg.addClass( 'text-info' );
    input.addClass( 'custom-range' );

    const fields = [
      'type',
      'name', 'id',
      'min', 'max', 'step', 'value',
      'data-slider-min', 'data-slider-max', 'data-slider-step', 'data-slider-value',
    ];

    fields.forEach( field => input.attr( field, details[ field ] ) );

    e.append( label );
    e.append( input );

    const showPercent = event => {
      const val = event.value || event.target.value;
      msg.text( `${val}%` );
      input.attr('data-slider-value', val );
    };
    showPercent({ value: details.value } );

    input.on( 'input', showPercent );

    e.append( msg );
  }

  else {
    e.append( label );
    const input = $(document.createElement('input'));
    input.addClass('form-control form-control-sm');
    const fields = [ 'min', 'max', 'step', 'name', 'type', 'id', 'value',
      'data-slider-min', 'data-slider-max', 'data-slider-step', 'data-slider-value' ];
    fields.forEach( f => input.attr( f, details[ f ] ) );
    e.append( input );

    if ( details['data-slider-value'] ) {
      const msg = $( '<span></span>' );
      const showPercent = event => {
        const val = event.value || event.target.value;
        msg.text( `${val}%` );
      };
      showPercent( { value: details[ 'data-slider-value' ] } );
      input.on( 'input', showPercent );
      e.append( msg );
    }
  }

  if ( details.help ) {
    const small = $(document.createElement('small'));
    small.addClass( 'form-text text-muted' );
    small.html( details.help );
    e.append( small );
  }

  return e;
}

function showModal ( label, content, onSave ) {
  $('#primary-modal').modal();
  $('#primary-modal h5').html(label);
  $('#primary-modal .modal-body').html(content);

  if ( onSave ) {
    const saveButton = $('<button type="submit" class="btn btn-success save-button">Save</button>');
    saveButton.click( onSave );
    $('#primary-modal .modal-footer')
      .empty()
      .append(saveButton)
  }
}

function hideModal () {
  $( '#primary-modal' ).modal('hide');
  $( '#primary-modal .modal-body' ).empty();
  $( '#primary-modal .modal-footer' ).empty();
}

function restartBraveConfirmation() {
  const label = 'Should the current configuration (inputs, etc.) be retained?';
  const currentConfigButton = $( '<button type="button" class="btn btn-primary">Yes, restart Brave and keep the current configuration</button>' );
  currentConfigButton.click( () => { restartBrave('current') } );
  const originalConfigButton = $( '<button type="button" class="btn btn-primary">No, restart Brave with the original configuration</button>' );
  originalConfigButton.click( () => { restartBrave('original') } );
  showModal( label, [ currentConfigButton, '<br /><br />', originalConfigButton ] )
}

function restartBrave ( config ) {
  hideModal ();
  $.ajax({
    type: 'POST',
    url: 'api/restart',
    data: JSON.stringify({ config } ),
    dataType: "json",
    contentType: "application/json",
    success: function() {
      showMessage('Restart underway', 'success')
    },
    error: function() {
      showMessage('Sorry, an error occurred', 'danger')
    }
  });
}

function ucFirst (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

function prettyUid (uid) {
  if (!uid) return uid;
  const matches = uid.match(/^(input|mixer|output|overlay)(\d+)$/);
  if (matches) {
    return ucFirst(matches[1] + ' ' + matches[2])
  }
  else {
    return uid
  }
}

function noItems () {
  return inputsHandler.items.length + outputsHandler.items.length + mixersHandler.items.length + overlaysHandler.items.length === 0
}

function showNoItemsMessage() {
  $('#cards').append(`Use the 'Add' button above to create inputs, mixers, outputs and overlays.`);
}

function submitCreateOrEdit ( blockType, id, values ) {
  const isUpdate = ( id !== null && id !== undefined );
  const type = isUpdate ? 'POST' : 'PUT';
  const url = `api/${blockType}s` + (isUpdate ? `/${id}` : '');
  $.ajax({
    contentType: 'application/json',
    type, url,
    dataType: 'json',
    data: JSON.stringify( values ),
    success: response => {
      const msg = isUpdate ?
        `Successfully updated ${blockType} ${id}` :
        `Successfully created ${blockType} ${response.id}`;
      showMessage ( msg, 'success' );
      updatePage();
    },
    error: response => {
      let msg = `Error creating ${blockType}` + (isUpdate ? ` ${id}` : '');
      if (response.responseJSON && response.responseJSON.error) {
        msg += ': ' + response.responseJSON.error
      }
      showMessage ( msg, 'danger' );
    }
  });
}

onPageLoad();
