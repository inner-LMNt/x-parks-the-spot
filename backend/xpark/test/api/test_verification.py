import unittest
from unittest.mock import patch, MagicMock
from my_parking_module import get_all_pending_parking_spaces, handle_verify_parking, handle_submit_verification
import uuid

class ParkingSpaceTests(unittest.TestCase):
    @patch('my_parking_module.DB.pool.connection')
    def test_get_all_pending_parking_spaces(self, mock_conn):
        # Mock database connection and cursor
        mock_cursor = MagicMock()
        mock_conn.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        # Define a sample row that the cursor will return
        mock_cursor.fetchall.return_value = [
            (
                uuid.uuid4(), "Test Spot", True, 'pending', 40.7128, -74.0060, "123 Test St",
                [], {}, ['photo1.jpg'], ['photo2.jpg'], None, None
            )
        ]

        mock_cursor.description = [
            ('id',), ('name',), ('is_paid',), ('verification_status',),
            ('latitude',), ('longitude',), ('address',),
            ('availability_schedule',), ('pricing_info',), ('photos',), ('verification_photos',),
            ('created_at',), ('updated_at',)
        ]

        # Call the function
        result = get_all_pending_parking_spaces()

        # Check the returned value
        self.assertTrue(result.is_ok())
        pending_spaces = result.value["pendingSpaces"]
        self.assertEqual(len(pending_spaces), 1)
        self.assertEqual(pending_spaces[0]["name"], "Test Spot")
        self.assertEqual(pending_spaces[0]["is_paid"], True)
        self.assertEqual(pending_spaces[0]["status"], "pending")

    @patch('my_parking_module.DB.pool.connection')
    @patch('my_parking_module.send_email')
    def test_handle_verify_parking(self, mock_send_email, mock_conn):
        # Mock database connection and cursor
        mock_cursor = MagicMock()
        mock_conn.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        # Mock fetching the parking space owner
        mock_cursor.fetchone.side_effect = [
            ("user-id",),  # Step 1: Fetch owner
            ("User Name", "user@example.com"),  # Step 3: Fetch user name and email
            ("verified",)  # Step 2: Update verification status
        ]

        # Call the function to verify the parking space
        parking_space_id = uuid.uuid4()
        result = handle_verify_parking(parking_space_id, True)

        # Check the email sending and return values
        self.assertTrue(result.is_ok())
        self.assertEqual(result.value["verification_status"], "verified")
        mock_send_email.assert_called_once_with(
            to="user@example.com",
            subject="Parking spot verification successful",
            content=mock_send_email.return_value
        )

    @patch('my_parking_module.DB.pool.connection')
    @patch('my_parking_module.save_image')
    def test_handle_submit_verification(self, mock_save_image, mock_conn):
        # Mock database connection and cursor
        mock_cursor = MagicMock()
        mock_conn.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        # Mock the image saving
        mock_save_image.return_value = "/static/images/test_image.jpg"

        # Mock database result
        mock_cursor.fetchone.return_value = (
            uuid.uuid4(), 'pending', ['/static/images/test_image.jpg'], None
        )

        # Call the function
        parking_space_id = uuid.uuid4()
        user_id = uuid.uuid4()
        mock_image_file = MagicMock()  # Mock image file
        result = handle_submit_verification(parking_space_id, mock_image_file, user_id)

        # Check the return value and image save
        self.assertTrue(result.is_ok())
        self.assertEqual(result.value["verification_photos"][0], "/static/images/test_image.jpg")
        mock_save_image.assert_called_once_with(mock_image_file)

if __name__ == '__main__':
    unittest.main()
