
loadAPI(1);

host.defineController("Novation", "Launchkey Mini MK2", "0.1", "261631f0-b8f9-4d69-8304-045d9fa6bb65");
host.defineMidiPorts(2, 2);
host.addDeviceNameBasedDiscoveryPair(
	["Launchkey Mini", "MIDIIN2 (Launchkey Mini)"],
	["Launchkey Mini", "MIDIOUT2 (Launchkey Mini)"]
);

load("launchkey_common.js");
//load("launchkey_vars.js");
//load("launchkey_leds.js");

var layout = "arranger";
switch(layout){
   case "arranger":
      track_prev = 104;
      track_next = 105;
      break;
   default:
      track_prev = 106;
      track_next = 107;
}

function init()
{
   //welcomeSequence();
   host.getMidiInPort(0).createNoteInput("Keys", "80????", "90????");
   host.getMidiInPort(0).createNoteInput("Pads", "89????", "99????");

   host.getMidiInPort(0).setMidiCallback(onMidi0);
   host.getMidiInPort(1).setMidiCallback(onMidi1);
/*   preferences = host.getPreferences();
   preferences.getSignalSetting("Example signal", "Options", "Arranger");*/

	/*
   host.getMidiOutPort(1).sendMidi(144,97,3);
   host.getMidiOutPort(1).sendMidi(0x90,98,16);
   host.getMidiOutPort(1).sendMidi(0x90, 0x0C, 0x00);
*/
	transport = host.createTransportSection();

   cursorTrack = host.createCursorTrackSection(0, 8);
   masterTrack = host.createMasterTrackSection(0);

   primaryDevice = cursorTrack.getPrimaryDevice();

   primaryDevice.addSelectedPageObserver(-1, function(value)
   {
      selectedPage = value;
   });

   primaryDevice.addPageNamesObserver(function()
   {
      numParameterPages = arguments.length;
   });

   trackBank = host.createTrackBankSection(8, 0, 0);

   for(var p=0; p<8; p++)
   {
      var modSource = primaryDevice.getModulationSource(p);
      modSource.addIsMappingObserver(modSourceStates.setter(p));
   }

   userControls = host.createUserControlsSection(8);

   for(var p=0; p<8; p++)
   {
      userControls.getControl(p).setLabel("User " + (p + 1));
   }

   sendMidi(0x90, 0x0C, 0x7F);
   host.getMidiOutPort(1).sendMidi(0x90, 10, 0x7F); // enable incontrol mode?
   host.getMidiOutPort(1).sendMidi(0x90, 97, 3);
	
   updateIndications();
welcomeSequence();
   host.scheduleTask(blinkTimer, null, 100);
}

var fastblink = false;
var blink = false;

function blinkTimer()
{
   fastblink = !fastblink;

   if (fastblink)
   {
      blink = !blink;
   }

   host.scheduleTask(blinkTimer, null, 100);
}

function updateIndications()
{
   for(var i=0; i<8; i++)
   {
      primaryDevice.getParameter(i).setIndication(incontrol);
      userControls.getControl(i).setIndication(!incontrol);
      primaryDevice.getMacro(i).getAmount().setIndication(incontrol);
      trackBank.getTrack(i).getVolume().setIndication(!incontrol);

   }
}

function welcomeSequence()
{
	for(var p=1; p < 9; p++){
		msg = 95 + p;
		host.getMidiOutPort(1).sendMidi(144, msg, 3);
	}
}

function exit()
{
   sendMidi(0x90, 0x0C, 0x00);
}

function flush()
{
   updateOutputState();
   flushOutputState();
}

function onMidi0(status, data1, data2) // !incontrol
{
	printMidi(status, data1, data2);
	

   if (isChannelController(status))
   {
      if (data1 >= 21 && data1 <= 28)
      {
         var knobIndex = data1 - 21;

         userControls.getControl(knobIndex).set(data2, 128);
      }
      else if (data1 >= 41 && data1 <= 48)
      {
         var sliderIndex = data1 - 41;

         trackBank.getTrack(sliderIndex).getVolume().set(data2, 128);
      }
      else if (data1 == 7)
      {
         masterTrack.getVolume().set(data2, 128);
      }
      else if (data1 >= 51 && data1 <= 58)
      {
         var buttonIndex = data1 - 51;

         if (data2 == 127)
         {
            trackBank.getTrack(buttonIndex).select();
         }
      }
   }
}

var incontrol = true;

function onMidi1(status, data1, data2)
{
   printMidi(status, data1, data2);
   
	
   if (isChannelController(status))// incontrol
   {
      if (data1 >= 21 && data1 <= 28)
      {
         var knobIndex = data1 - 21;
		primaryDevice.getMacro(knobIndex).getAmount().set(data2, 128);
         //primaryDevice.getParameter(knobIndex).set(data2, 128);
      }
	  
	  /*
	  // faders
      else if (data1 == 7)
      {
         cursorTrack.getVolume().set(data2, 128);
      }
	  // buttons on launchkey 49
      else if (data1 >= 51 && data1 <= 58)
      {
         var buttonIndex = data1 - 51;

         if (data2 == 127)
         {
            primaryDevice.getMacro(buttonIndex).getModulationSource().toggleIsMapping();
         }
      }
	  */

      if (data2 == 127)
      {
         // button presses

         if (data1 == track_prev)
         {
            if (incontrol)
            {
               cursorTrack.selectPrevious();
            }
            else
            {
               trackBank.scrollTracksPageUp();
            }
         }
         else if (data1 == track_next)
         {
            if (incontrol)
            {
               cursorTrack.selectNext();
            }
            else
            {
               trackBank.scrollTracksPageDown();
            }
         }
         else if (data1 == 106)
         {
            transport.rewind();
         }
         else if (data1 == 107)
         {
            transport.fastForward();
         }
         else if (data1 == 114)
         {
            transport.stop();
         }
         else if (data1 == 115)
         {
            transport.play();
         }
         else if (data1 == 116)
         {
            transport.toggleLoop();
         }
         else if (data1 == 117)
         {
            transport.record();
         }
      }
   }
println("channel: " + MIDIChannel(status));
   if (MIDIChannel(status) == 0 && isNoteOn(status)) 
   {
      if (data1 >= 96 && data1 < 104)
      {
		  println("test");
         var i = data1 - 96;
         primaryDevice.setParameterPage(i);
      }
      else if (data1 >= 112 && data1 < 120)
      {
         var i = data1 - 112;
         primaryDevice.getModulationSource(i).toggleIsMapping();
      }
      else if (data1 == 104)
      {
         primaryDevice.switchToPreviousPreset();
      }
      else if (data1 == 105)
      {
         primaryDevice.switchToNextPreset();
      }

      if (data1 == 10)
      {
         incontrol = data2 == 127;
         host.showPopupNotification(incontrol ? "Parameters" : "User Mappings");
         updateIndications();
      }
   }
}
