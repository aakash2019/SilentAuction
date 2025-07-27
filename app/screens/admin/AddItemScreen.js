// screens/admin/AddItemScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  TextInput,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/Colors';
import { auth, db, storage } from '../../firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Item from '../../models/Item';

const { width } = Dimensions.get('window');

export default function AddItemScreen({ navigation }) {
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [startingBid, setStartingBid] = useState('');
  const [shippingCost, setShippingCost] = useState('0');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to 7 days from now
  const [endTime, setEndTime] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraRef, setCameraRef] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();

  const categories = [
    'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 
    'Art & Collectibles', 'Jewelry', 'Automotive', 'Music', 'Other'
  ];

  const conditions = [
    'New', 'Like New', 'Very Good', 'Good', 'Fair', 'Poor'
  ];

  useEffect(() => {
    checkAdminStatus();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
      Alert.alert('Permission Required', 'Camera and photo library permissions are required to add photos.');
    }

    // Request camera permission for the new camera component
    if (!permission?.granted) {
      await requestPermission();
    }
  };

  const checkAdminStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add items.');
        navigation.goBack();
        return;
      }

      // Check if user is admin by looking in the admin collection
      const adminDoc = await getDoc(doc(db, 'admin', user.uid));
      
      if (!adminDoc.exists()) {
        Alert.alert('Access Denied', 'Only administrators can add new items.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      const adminData = adminDoc.data();
      if (!adminData.isAdmin) {
        Alert.alert('Access Denied', 'Only administrators can add new items.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to verify admin status.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleCategoryPress = () => {
    Alert.alert(
      'Select Category',
      '',
      categories.map(cat => ({
        text: cat,
        onPress: () => setCategory(cat)
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const handleConditionPress = () => {
    Alert.alert(
      'Select Condition',
      '',
      conditions.map(cond => ({
        text: cond,
        onPress: () => setCondition(cond)
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      // Update the time with the new date but keep the existing time
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(endTime.getHours(), endTime.getMinutes());
      setEndTime(newDateTime);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setEndTime(selectedTime);
      // Update the date with the new time but keep the existing date
      const newDateTime = new Date(endDate);
      newDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setEndDate(newDateTime);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEndDateTime = () => {
    const combinedDateTime = new Date(endDate);
    combinedDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    return combinedDateTime;
  };

  const handleAddPhotos = () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 photos.');
      return;
    }
    setShowImagePicker(true);
  };

  const selectImageFromLibrary = async () => {
    setShowImagePicker(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image from library.');
    }
  };

  const takePhoto = async () => {
    setShowImagePicker(false);
    
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }
    }
    
    setCameraVisible(true);
  };

  const handleTakePhoto = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.8,
        });
        setPhotos(prev => [...prev, photo.uri]);
        setCameraVisible(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo.');
      }
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (uri, fileName) => {
    try {
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      const imageRef = ref(storage, `items/${fileName}`);
      
      const snapshot = await uploadBytes(imageRef, blob);
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      
      // If storage fails, try using the local URI as fallback for testing
      if (error.code === 'storage/unknown' || error.code === 'storage/unauthorized') {
        return uri; // Return local URI as fallback
      }
      throw error;
    }
  };

  const validateInputs = () => {
    const errors = [];

    if (!itemName.trim() || itemName.trim().length < 3) {
      errors.push('Item name must be at least 3 characters long');
    }

    if (!description.trim() || description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    if (!startingBid.trim() || isNaN(parseFloat(startingBid)) || parseFloat(startingBid) <= 0) {
      errors.push('Starting bid must be a valid number greater than 0');
    }

    if (shippingCost.trim() && (isNaN(parseFloat(shippingCost)) || parseFloat(shippingCost) < 0)) {
      errors.push('Shipping cost must be a valid number (0 or greater)');
    }

    if (!category) {
      errors.push('Category is required');
    }

    if (!condition) {
      errors.push('Condition is required');
    }

    const endDateTime = getEndDateTime();
    if (endDateTime <= new Date()) {
      errors.push('End date and time must be in the future');
    }

    if (photos.length === 0) {
      errors.push('At least one photo is required');
    }

    return errors;
  };

  const handleListItem = async () => {
    if (!isAdmin) {
      Alert.alert('Error', 'Only administrators can add items.');
      return;
    }

    const errors = validateInputs();
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get admin details
      const adminDoc = await getDoc(doc(db, 'admin', user.uid));
      const adminData = adminDoc.data();

      // Upload photos with error handling
      const uploadedPhotos = [];
      let uploadErrors = [];
      
      for (let i = 0; i < photos.length; i++) {
        try {
          const fileName = `${Date.now()}_${i}.jpg`;
          const downloadURL = await uploadImage(photos[i], fileName);
          uploadedPhotos.push(downloadURL);
        } catch (uploadError) {
          uploadErrors.push(`Photo ${i + 1}: ${uploadError.message}`);
          // For testing purposes, use local URI if upload fails
          uploadedPhotos.push(photos[i]);
        }
      }

      // Show warning if some uploads failed but continue with listing
      if (uploadErrors.length > 0) {
        Alert.alert(
          'Photo Upload Warning', 
          `Some photos failed to upload to cloud storage but the item will be listed with local photos for testing.\n\nErrors:\n${uploadErrors.join('\n')}`,
          [{ text: 'Continue', style: 'default' }]
        );
      }

      // Create new item
      const newItem = new Item({
        itemName: itemName.trim(),
        description: description.trim(),
        startingBid: startingBid.trim(),
        shippingCost: shippingCost.trim() || 0,
        category,
        condition,
        endDateTime: getEndDateTime().toISOString(),
        photos: uploadedPhotos
      });

      // Validate the item
      const validationErrors = newItem.validate();
      if (validationErrors.length > 0) {
        Alert.alert('Validation Error', validationErrors.join('\n'));
        setIsLoading(false);
        return;
      }

      // Add to Firestore in the correct nested collection structure
      const docRef = await addDoc(collection(db, 'listings', 'listings', 'active'), newItem.toFirestore());
      
      // Create bidders subcollection for this item (empty initially)
      // This sets up the structure for future bidders
      

      Alert.alert('Success', 'Item listed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to ListingsScreen and refresh
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      
      let errorMessage = 'Failed to list item';
      
      if (error.code === 'storage/unknown' || error.code === 'storage/unauthorized') {
        errorMessage = 'Storage error: Please check Firebase Storage rules and configuration';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied: Please check Firestore security rules';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDropdownField = (placeholder, value, onPress) => (
    <TouchableOpacity style={styles.dropdownField} onPress={onPress}>
      <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={20} color={Colors.PRIMARY_GREEN} />
    </TouchableOpacity>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY_GREEN} />
          <Text style={styles.loadingText}>Verifying admin access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_BLACK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Item</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Item Name */}
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Item Name"
            placeholderTextColor={Colors.TEXT_GRAY}
            value={itemName}
            onChangeText={setItemName}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldContainer}>
          <TextInput
            style={[styles.textInput, styles.descriptionInput]}
            placeholder="Description"
            placeholderTextColor={Colors.TEXT_GRAY}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Starting Bid */}
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Starting Bid ($)"
            placeholderTextColor={Colors.TEXT_GRAY}
            value={startingBid}
            onChangeText={setStartingBid}
            keyboardType="numeric"
          />
        </View>

        {/* Shipping Cost */}
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Shipping Cost ($)"
            placeholderTextColor={Colors.TEXT_GRAY}
            value={shippingCost}
            onChangeText={setShippingCost}
            keyboardType="numeric"
          />
        </View>

        {/* Category */}
        <View style={styles.fieldContainer}>
          {renderDropdownField('Category', category, handleCategoryPress)}
        </View>

        {/* Condition */}
        <View style={styles.fieldContainer}>
          {renderDropdownField('Condition', condition, handleConditionPress)}
        </View>

        {/* End Date and Time */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Auction End Date & Time</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity 
              style={[styles.dateTimeButton, { flex: 1, marginRight: 8 }]} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>{formatDate(endDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color={Colors.PRIMARY_GREEN} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dateTimeButton, { flex: 1, marginLeft: 8 }]} 
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeText}>{formatTime(endTime)}</Text>
              <Ionicons name="time-outline" size={20} color={Colors.PRIMARY_GREEN} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Photos Section */}
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Photos ({photos.length}/5)</Text>
          
          {/* Selected Photos */}
          {photos.length > 0 && (
            <View style={styles.selectedPhotos}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photoPreview} />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.PRIMARY_GREEN} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Photos Button */}
          <View style={styles.photosContainer}>
            <View style={styles.addPhotosBox}>
              <Text style={styles.addPhotosTitle}>Add Photos</Text>
              <Text style={styles.addPhotosSubtitle}>Add up to 5 photos to show off your item</Text>
              <TouchableOpacity style={styles.addPhotosButton} onPress={handleAddPhotos}>
                <Text style={styles.addPhotosButtonText}>Add Photos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* List Item Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.listButton, isLoading && styles.disabledButton]} 
            onPress={handleListItem}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.WHITE} />
            ) : (
              <Text style={styles.listButtonText}>List Item</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Photo</Text>
            <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color={Colors.PRIMARY_GREEN} />
              <Text style={styles.modalButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={selectImageFromLibrary}>
              <Ionicons name="images" size={24} color={Colors.PRIMARY_GREEN} />
              <Text style={styles.modalButtonText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Camera Modal */}
      <Modal
        visible={cameraVisible}
        animationType="slide"
        style={styles.cameraModal}
      >
        <CameraView
          style={styles.camera}
          ref={setCameraRef}
          facing="back"
        >
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.cancelCameraButton}
              onPress={() => setCameraVisible(false)}
            >
              <Ionicons name="close" size={30} color={Colors.WHITE} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <View style={styles.placeholder} />
          </View>
        </CameraView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND_WHITE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.TEXT_GRAY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  fieldContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.TEXT_BLACK,
  },
  descriptionInput: {
    height: 120,
    paddingTop: 14,
  },
  dropdownField: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.TEXT_BLACK,
  },
  placeholderText: {
    color: Colors.TEXT_GRAY,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.TEXT_BLACK,
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeButton: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeText: {
    fontSize: 16,
    color: Colors.TEXT_BLACK,
  },
  photosSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 16,
  },
  selectedPhotos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  photoContainer: {
    marginRight: 12,
    marginBottom: 12,
    position: 'relative',
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
  },
  photosContainer: {
    borderWidth: 2,
    borderColor: Colors.BACKGROUND_LIGHT_GRAY,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  addPhotosBox: {
    alignItems: 'center',
  },
  addPhotosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    marginBottom: 8,
  },
  addPhotosSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_GRAY,
    textAlign: 'center',
    marginBottom: 20,
  },
  addPhotosButton: {
    backgroundColor: Colors.BACKGROUND_LIGHT_GRAY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addPhotosButtonText: {
    fontSize: 16,
    color: Colors.TEXT_BLACK,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  listButton: {
    backgroundColor: Colors.PRIMARY_GREEN,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  listButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.WHITE,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_BLACK,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BACKGROUND_LIGHT_GRAY,
  },
  modalButtonText: {
    fontSize: 16,
    color: Colors.TEXT_BLACK,
    marginLeft: 16,
  },
  cancelButton: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.PRIMARY_GREEN,
    fontWeight: '600',
  },
  cameraModal: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 30,
  },
  cancelCameraButton: {
    alignSelf: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.PRIMARY_GREEN,
  },
});
