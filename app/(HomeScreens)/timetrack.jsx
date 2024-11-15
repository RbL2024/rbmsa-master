import { StyleSheet, Text, View, Image, TouchableOpacity, Alert } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer'
import RDim from '../../hooks/useDimensions';
import { LinearGradient } from 'expo-linear-gradient';
import ToastManager, { Toast } from 'toastify-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getResInfo, getResBike, cancelReservation, reserveAPI } from '@/hooks/myAPI';
import { useNavigation } from '@react-navigation/native';
import Rentdue from './rentdue';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function formatTimeWithHours(seconds) {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  // Format hours, minutes, and seconds to always have two digits
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}


const formatTime = (date) => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const formattedHours = hours % 12 || 12; // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${formattedHours}:${minutes}:${seconds} ${period}`;
  // return `${formattedHours}:${minutes} ${period}`;
};

function timeToSeconds(timeStr) {
  const [time, period] = timeStr.split(' '); // Split time and period (AM/PM)
  let [hours, minutes, seconds] = time.split(':').map(Number); // Split hours and minutes and convert to numbers

  // Convert to 24-hour format
  if (period === 'PM' && hours < 12) {
    hours += 12; // Convert PM hours to 24-hour format
  }
  if (period === 'AM' && hours === 12) {
    hours = 0; // Convert 12 AM to 0 hours
  }

  // Calculate total seconds
  return (hours * 3600) + (minutes * 60) + seconds;
}


function convertRTime(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    console.error('Invalid timeString:', timeString);
    return ''; // Return an empty string or handle the error as appropriate
  }

  // Split the time string into time and period (AM/PM)
  const parts = timeString.split(' '); // Split time and period (AM/PM)

  // Extract time and period
  const time = parts[0]; // The time part
  const period = parts.length > 1 ? parts[1] : ''; // The period part (if it exists)

  // Append ':00' to the time part to include seconds
  let timeWithSeconds = `${time}:00`;

  // Include the period only if it is valid (AM/PM)
  if (period && (period === 'AM' || period === 'PM')) {
    timeWithSeconds += ` ${period}`;
  }

  return timeWithSeconds;
}

function secondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format hours, minutes, and seconds to always have two digits
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}`;
}


const HorizontalLine = ({ color = 'gray', thickness = 1.5, mv = 5, style }) => {
  return <View style={[styles.line, { backgroundColor: color, height: thickness, marginVertical: mv }, style]} />;
};


const getBikeIdEmail = async () => {
  try {
    const bID = await AsyncStorage.getItem('bike_id');
    const email = await AsyncStorage.getItem('email');
    if (bID !== null && email !== null) {
      return { bID, email };
    } else {
      return 'undefined';
    }
  } catch (e) {
    console.error('Failed to fetch data', e);
  }
};

function formatDateTime(dateString) {
  const date = new Date(dateString);

  // Format the date to MMM/DD/yyyy
  const options = { year: 'numeric', month: 'short', day: '2-digit' };
  const formattedDate = date.toLocaleDateString('en-US', options);

  // Replace the month with its abbreviated form and ensure the day is two digits
  const [month, day, year] = formattedDate.split(' ');
  const formattedDateString = `${month} ${String(day).padStart(2, '0')} ${year}`;

  // Format the time to 12-hour format with AM/PM
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const formattedTime = `${hours % 12 || 12}:${minutes} ${period}`; // Convert to 12-hour format

  return `${formattedDateString}`; // Combine date and time
}





export default function Timetrack() {
  const nav = useNavigation();
  const [reservedTime, setReservedTime] = useState('00:00');
  const [duration, setDuration] = useState(0);
  const [hoursLate, setHoursLate] = useState('');
  const [canceled, setCanceled] = useState(false);
  const [bikeIdEmail, setBikeIdEmail] = useState([]);
  const [reservedBike, setReservedBike] = useState([]);




  const loadResTime = async () => {
    try {
      const data = bikeIdEmail;
      if (!data) {
        console.error('Bike ID is undefined. Cannot load reservation time.');
        return; // Exit if bikeId is not set
      }

      const loadRTime = await axios.post(getResInfo, data);
      const resTime = loadRTime.data.timeofuse;

      if (resTime) {
        setReservedTime(resTime);
      } else {
        setHoursLate('00:00');
      }
    } catch (error) {
      console.error('Error loading reserved time:', error.response ? error.response.data : error.message);
      setHoursLate('00:00');
    }
  };

  const getReservedBike = async () => {
    try {
      const data = bikeIdEmail;
      const response = await axios.post(getResBike, data);

      const bikeInfo = response.data.bikeInfo || [];
      const reservationsToday = response.data.reservationsToday || [];

      const combinedBikeData = bikeInfo.map((bike, index) => ({
        ...bike,
        ...reservationsToday[index],
      }));

      setReservedBike(combinedBikeData);
    } catch (error) {
      console.error('Error fetching reserved bikes:', error.response);
    }
  };


  // UseEffect to get bike ID and email once
  useEffect(() => {
    const getbid = async () => {
      setBikeIdEmail(await getBikeIdEmail());
    }
    getbid();
  }, []);

  // UseEffect to load reservation time and reserved bike data
  useEffect(() => {
    const fetchReservationData = async () => {
      await loadResTime(); // Wait for loadResTime to complete
      await getReservedBike(); // Then call getReservedBike
    };

    fetchReservationData();
  }, [bikeIdEmail]);

  // UseEffect for updating hours late
  useEffect(() => {
    const reservedSeconds = timeToSeconds(convertRTime(reservedTime));
    const now = new Date();
    const currentSeconds = timeToSeconds(formatTime(now));
    const initialTimeDifference = reservedSeconds - currentSeconds;
    setDuration(initialTimeDifference > 0 ? initialTimeDifference : 0);

    const updateHoursLateInterval = setInterval(() => {
      const now = new Date();
      const currentSeconds = timeToSeconds(formatTime(now));
      const timeDifference = reservedSeconds - currentSeconds;

      if (timeDifference < 0 && reservedTime !== '00:00') {
        setHoursLate(secondsToTime(Math.abs(timeDifference)));
        if (secondsToTime(Math.abs(timeDifference)) >= 3600) {
          setCanceled(true);
          Alert.alert('Information', 'You are 1 hours late, your reservation is now canceled', 
            [
              {
                text: "Okay",
                onPress:async()=>{
                  nav.navigate('index')
                }
              }
            ])
          updateReservationStatusToCancel();
        } else {
          setCanceled(false);
        }
      } else {
        setHoursLate('00:00');
      }
    }, 1000);

    return () => {
      clearInterval(updateHoursLateInterval);
    };
  }, [reservedTime]);

  const handleCancelReserve = async () => {
    if (reservedTime !== '00:00') {
      Alert.alert(
        "Cancel Reservation",
        "Are you sure you want to cancel your reservation?",
        [
          {
            text: "Cancel",
            onPress: () => console.log("Cancel Pressed"),
            style: "cancel"
          },
          {
            text: "OK",
            onPress: async () => {
              try {
                await updateReservationStatusToCancel();
                Toast.info('Your reservation has been canceled.');
                await delay(2000);
                nav.navigate('index');
                // Optional: Show a toast message
              } catch (error) {
                console.error('Error canceling reservation:', error);
              }
            }
          }
        ],
        { cancelable: false }
      );
    }
  };

  const updateReservationStatusToCancel = async () => {
    try {
      const data = bikeIdEmail; // Assuming you have the necessary data to identify the reservation
      console.log(cancelReservation);
      const response = await axios.put(cancelReservation, data); // Replace with your actual API endpoint
      console.log(response.data);
    } catch (error) {
      console.error('Error updating reservation status:', error.response ? error.response.data : error.message);
    }
  };

  const [rented, setRented] = useState(false);

  return (
    rented?(
      <Rentdue/>
    ):(
      <LinearGradient
      colors={["#355E3B", "#D6D6CA"]} // Define your gradient colors here
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.35 }}
      style={styles.container}
    >
      <ToastManager
        position="top"
        textStyle={{ fontSize: 12, paddingHorizontal: 10 }}
        duration={2000}
        showCloseIcon={false}
        showProgressBar={false}
      />
      <Text style={styles.title}>Reservation Time</Text>
      <CountdownCircleTimer
        size={RDim.scale * 100}
        trailColor='whitesmoke'
        // isGrowing={true}
        isPlaying
        duration={duration} // Set the duration in seconds
        colors={['#355E3B']} // Colors for the timer
        onComplete={() => {
          // Action to take when the timer completes
          const now = new Date();
          const currentSeconds = timeToSeconds(formatTime(now));
          const reservedSeconds = timeToSeconds(convertRTime(reservedTime));
          console.log(currentSeconds, reservedSeconds);
          if (currentSeconds >= reservedSeconds) {
            setDisableCBTN(false); // Enable the cancel button when the timer completes
          }

          return { shouldRepeat: false }; // Prevents the timer from repeating
        }}
      >
        {() => (
          <>
            <View style={{ gap: 5 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.default}>Reserved Time</Text>
                <Text style={styles.currentTimeText}>{reservedTime}</Text>
              </View>
              <HorizontalLine style={{ width: RDim.width * .5 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.currentTimeText}>{hoursLate}</Text>
                <Text style={styles.default}>Hours Late</Text>
              </View>
            </View>
          </>
        )}
      </CountdownCircleTimer>
      <View style={{ marginTop: 30, height: RDim.height * .05 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'mplusb', fontSize: RDim.width * .05 }}>You can be late only for 1 hour</Text>
          <Text style={{ fontFamily: 'mplusb', fontSize: RDim.width * .025, color: '#AB0505' }}>(your reservation will be automatically canceled after 1 hour)</Text>
        </View>
      </View>
      <View>
        <View style={styles.bcard}>
          {
            reservedBike.map((bike) => {
              return (
                <View key={bike.bike_id} style={styles.bcardCon}>
                  <Image source={{ uri: bike.bike_image_url }} style={styles.bimage} />
                  <View style={styles.btextContainer}>
                    <Text style={styles.bdate}>rented date: {formatDateTime(bike.reservation_date)}</Text>
                    <Text style={styles.bname}>bike id: {bike.bike_id}</Text>
                    <Text style={styles.bcontact}>Gcash #: {bike.phone}</Text>
                  </View>
                </View>
              )
            })
          }
        </View>
      </View>
      <View style={btnCon.container}>
        <TouchableOpacity onPress={handleCancelReserve}>
          <View style={[btnCon.btn, { backgroundColor: '#AB0505' }]}>
            <Text style={btnCon.text}>Cancel Reservation</Text>
          </View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
    )
  )
}

const btnCon = StyleSheet.create({
  container: {
    width: RDim.width * .9,
    height: 'auto',
    // backgroundColor: "#D6D6CA",
    // elevation: 10,
    alignItems: 'center',
    justifyContent: "center",
    marginTop: RDim.height * .12
  },
  btn: {
    width: RDim.width * .7,
    height: RDim.height * .05,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  text: {
    color: 'white',
    fontFamily: 'mplus'
  }
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#D6D6CA'
  },
  title: {
    fontSize: RDim.width * 0.08,
    marginBottom: 20,
    marginTop: 50,
    fontFamily: 'mplusb'
  },
  currentTimeText: {
    fontSize: RDim.width * 0.08,
    color: '#000',
    fontFamily: 'mplus'
  },
  default: {
    fontSize: RDim.width * 0.04,
    color: '#000',
    fontFamily: 'mplus'
  },
  resetButton: {
    marginTop: 20,
    fontSize: 18,
    color: '#007BFF',
  },
  bcard: {
    width: RDim.width * 0.9,
    height: RDim.width * 0.25,
    backgroundColor: '#D6D6CA',
    elevation: 10,
    borderRadius: 10,
    padding: 10,
    marginTop: RDim.height * .08
  },
  bcardCon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    alignItems: 'center'
  },
  bimage: {
    width: RDim.width * 0.3,
    height: RDim.height * 0.1,
    objectFit: 'contain'
  },
  btextContainer: {
    gap: 10
  }
});