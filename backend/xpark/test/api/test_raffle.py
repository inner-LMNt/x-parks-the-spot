import uuid
from flask.testing import FlaskClient
from unittest.mock import patch, MagicMock
from xpark.logic.admin import get_raffle_entries, perform_raffle
from xpark.logic.user import handle_buy_badge, handle_get_badge_list, handle_buy_raffle_ticket, handle_get_raffle_tickets, handle_get_points, handle_get_transaction_history
from xpark.utils.db import DB

# test_raffle.py
@patch('xpark.utils.db.DB.pool.connection')
def test_get_raffle_entries(mock_connection):
    mock_cursor = MagicMock()
    mock_connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User1',
            'email': 'user1@example.com',
            'tickets': 10
        },
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User2',
            'email': 'user2@example.com',
            'tickets': 5
        }
    ]

    result = get_raffle_entries()

    assert result.is_ok()
    assert len(result.unwrap()) == 2
    assert result.unwrap()[0]['username'] == 'User1'
    assert result.unwrap()[1]['username'] == 'User2'

@patch('xpark.utils.db.DB.pool.connection')
@patch('xpark.utils.mailer.send_email')
def test_perform_raffle(mock_send_email, mock_connection):
    mock_cursor = MagicMock()
    mock_connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User1',
            'email': 'user1@example.com',
            'tickets': 10
        },
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User2',
            'email': 'user2@example.com',
            'tickets': 5
        }
    ]

    result = perform_raffle()

    assert result.is_ok()
    winner = result.unwrap()[0]
    assert winner['username'] in ['User1', 'User2']
    assert mock_send_email.called
    assert mock_send_email.call_args[1]['to'] == winner['email']
    assert mock_send_email.call_args[1]['subject'] == "Congratulations! You've Won the XPark Raffle"

# test_buy_get_badge.py
def test_handle_buy_badge(client: FlaskClient, mocker):
    user_id = uuid.uuid4()
    badge_id = 1
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchone.side_effect = [
        {'current': 1000},
        {'badges': []}
    ]

    result = handle_buy_badge(user_id, badge_id)

    assert result.is_ok()

def test_handle_get_badge_list(client: FlaskClient, mocker):
    user_id = uuid.uuid4()
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = {'badges': [1, 2, 3]}

    result = handle_get_badge_list(user_id)

    assert result.is_ok()
    assert result.unwrap() == [1, 2, 3]

# test_buy_get_raffle_ticket.py
def test_handle_buy_raffle_ticket(client: FlaskClient, mocker):
    user_id = uuid.uuid4()
    raffle_id = 4
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchone.side_effect = [
        {'current': 1000}
    ]

    result = handle_buy_raffle_ticket(user_id, raffle_id)

    assert result.is_ok()

def test_handle_get_raffle_tickets(client: FlaskClient, mocker):
    user_id = uuid.uuid4()
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = {'count': 5}

    result = handle_get_raffle_tickets(user_id)

    assert result.is_ok()
    assert result.unwrap() == {'count': 5}

# test_get_points_and_transactions.py
def test_handle_get_points(client: FlaskClient, mocker):
    user_id = uuid.uuid4()
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = {'total': 1000, 'current': 500}

    result = handle_get_points(user_id)

    assert result.is_ok()
    assert result.unwrap() == {'total': 1000, 'current': 500}

def test_handle_get_transaction_history(client: FlaskClient, mocker):
    user_id = uuid.uuid4()
    mocker.patch.object(DB.pool, 'connection', return_value=mocker.MagicMock())
    mock_cursor = mocker.MagicMock()
    DB.pool.connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            'balance_after_transaction': 500,
            'description': 'Test Transaction',
            'points_amount': 100,
            'transaction_type': 'spend'
        }
    ]

    result = handle_get_transaction_history(user_id)

    assert result.is_ok()
    assert result.unwrap() == [
        {
            'balance_after_transaction': 500,
            'description': 'Test Transaction',
            'points_amount': 100,
            'transaction_type': 'spend'
        }
    ]

    assert result.is_ok()
    assert len(result.unwrap()) == 2
    assert result.unwrap()[0]['username'] == 'User1'
    assert result.unwrap()[1]['username'] == 'User2'

@patch('xpark.utils.db.DB.pool.connection')
@patch('xpark.utils.mailer.send_email')
def test_perform_raffle(mock_send_email, mock_connection):
    mock_cursor = MagicMock()
    mock_connection().__enter__().cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User1',
            'email': 'user1@example.com',
            'tickets': 10
        },
        {
            'user_id': str(uuid.uuid4()),
            'username': 'User2',
            'email': 'user2@example.com',
            'tickets': 5
        }
    ]

    result = perform_raffle()

    assert result.is_ok()
    winner = result.unwrap()[0]
    assert winner['username'] in ['User1', 'User2']
    assert mock_send_email.called
    assert mock_send_email.call_args[1]['to'] == winner['email']
    assert mock_send_email.call_args[1]['subject'] == "Congratulations! You've Won the XPark Raffle"