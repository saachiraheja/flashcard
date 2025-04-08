from flask import Flask, render_template, request, redirect, url_for, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
import random
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Get MongoDB URI from environment variables
MONGO_URI = os.getenv('MONGO_URI')

app = Flask(__name__)

# MongoDB Setup
client = MongoClient(MONGO_URI)
db = client['flashcard_app']
decks_collection = db['decks']

# Home Route (Shows all decks)
@app.route('/')
def index():
    decks = list(decks_collection.find())
    return render_template('index.html', decks=decks)

# Create a Deck
@app.route('/decks/new', methods=['GET', 'POST'])
def create_deck():
    if request.method == 'POST':
        deck_name = request.form['name']
        if deck_name:
            deck = {'name': deck_name, 'flashcards': []}
            decks_collection.insert_one(deck)
            return redirect(url_for('index'))
        else:
            return "Deck name is required!", 400
    return render_template('create_deck.html')

# View a Deck and its Flashcards
@app.route('/decks/<deck_id>', methods=['GET'])
def view_deck(deck_id):
    deck = decks_collection.find_one({"_id": ObjectId(deck_id)})
    if not deck:
        return "Deck not found!", 404
    return render_template('view_deck.html', deck=deck)

# Update Deck Name
@app.route('/decks/<deck_id>/edit', methods=['GET', 'POST'])
def edit_deck(deck_id):
    deck = decks_collection.find_one({"_id": ObjectId(deck_id)})
    if not deck:
        return "Deck not found!", 404

    if request.method == 'POST':
        new_name = request.form['name']
        if new_name:
            decks_collection.update_one(
                {"_id": ObjectId(deck_id)},
                {"$set": {"name": new_name}}
            )
            return redirect(url_for('view_deck', deck_id=deck_id))
        else:
            return "New name is required!", 400

    return render_template('edit_deck.html', deck=deck)

# Delete Deck
@app.route('/decks/<deck_id>/delete', methods=['POST'])
def delete_deck(deck_id):
    result = decks_collection.delete_one({"_id": ObjectId(deck_id)})
    if result.deleted_count == 0:
        return "Deck not found!", 404
    return redirect(url_for('index'))

# Create a Flashcard
@app.route('/decks/<deck_id>/flashcards/new', methods=['GET', 'POST'])
def create_flashcard(deck_id):
    deck = decks_collection.find_one({"_id": ObjectId(deck_id)})
    if not deck:
        return "Deck not found!", 404

    if request.method == 'POST':
        question = request.form['question']
        answer = request.form['answer']
        if question and answer:
            flashcard = {'question': question, 'answer': answer}
            decks_collection.update_one(
                {"_id": ObjectId(deck_id)},
                {"$push": {"flashcards": flashcard}}
            )
            return redirect(url_for('view_deck', deck_id=deck_id))
        else:
            return "Question and answer are required!", 400

    return render_template('create_flashcard.html', deck=deck)

# Update Flashcard
@app.route('/decks/<deck_id>/flashcards/<flashcard_id>/edit', methods=['GET', 'POST'])
def edit_flashcard(deck_id, flashcard_id):
    deck = decks_collection.find_one({"_id": ObjectId(deck_id)})
    if not deck:
        return "Deck not found!", 404

    flashcard = next((fc for fc in deck['flashcards'] if str(fc['_id']) == flashcard_id), None)
    if not flashcard:
        return "Flashcard not found!", 404

    if request.method == 'POST':
        new_question = request.form['question']
        new_answer = request.form['answer']
        if new_question and new_answer:
            flashcard['question'] = new_question
            flashcard['answer'] = new_answer
            decks_collection.update_one(
                {"_id": ObjectId(deck_id)},
                {"$set": {"flashcards": deck['flashcards']}}
            )
            return redirect(url_for('view_deck', deck_id=deck_id))

    return render_template('edit_flashcard.html', deck=deck, flashcard=flashcard)

# Delete Flashcard
@app.route('/decks/<deck_id>/flashcards/<flashcard_id>/delete', methods=['POST'])
def delete_flashcard(deck_id, flashcard_id):
    deck = decks_collection.find_one({"_id": ObjectId(deck_id)})
    if not deck:
        return "Deck not found!", 404

    flashcard = next((fc for fc in deck['flashcards'] if str(fc['_id']) == flashcard_id), None)
    if not flashcard:
        return "Flashcard not found!", 404

    decks_collection.update_one(
        {"_id": ObjectId(deck_id)},
        {"$pull": {"flashcards": {"_id": flashcard["_id"]}}}
    )
    return redirect(url_for('view_deck', deck_id=deck_id))

# Quiz Mode: Random Flashcards from a Deck
from flask import request, redirect, url_for

@app.route('/decks/<deck_id>/quiz', methods=['GET', 'POST'])
def quiz_mode(deck_id):
    deck = decks_collection.find_one({"_id": ObjectId(deck_id)})
    if not deck:
        return "Deck not found!", 404

    flashcards = deck['flashcards']
    random_flashcards = random.sample(flashcards, min(len(flashcards), 5))  # Limit to 5 random cards

    # Get the current index from the query string (if any), default to 0
    index = int(request.args.get('index', 0))
    
    # Check the user's answer if it's a POST request
    is_correct = None
    if request.method == 'POST':
        user_answer = request.form['answer'].strip()
        correct_answer = random_flashcards[index]['answer']
        is_correct = user_answer.lower() == correct_answer.lower()

    # Determine the next index (circular loop)
    next_index = (index + 1) % len(random_flashcards)

    return render_template('quiz_mode.html', 
                           deck=deck, 
                           flashcard=random_flashcards[index],
                           index=index,
                           is_correct=is_correct,
                           next_index=next_index)


# API Endpoints for Flashcards and Decks (Optional)
@app.route('/api/decks', methods=['GET'])
def api_get_decks():
    decks = list(decks_collection.find())
    return jsonify(decks)

@app.route('/api/decks', methods=['POST'])
def api_create_deck():
    data = request.json
    deck_name = data.get('name')
    if not deck_name:
        return jsonify({"message": "Deck name is required!"}), 400
    deck = {'name': deck_name, 'flashcards': []}
    decks_collection.insert_one(deck)
    return jsonify({"message": "Deck created successfully!"}), 201

@app.route('/api/flashcards/<deck_id>', methods=['POST'])
def api_add_flashcard(deck_id):
    data = request.json
    question = data.get('question')
    answer = data.get('answer')
    if not question or not answer:
        return jsonify({"message": "Question and answer are required!"}), 400

    deck = decks_collection.find_one({"_id": ObjectId(deck_id)})
    if not deck:
        return jsonify({"message": "Deck not found!"}), 404

    flashcard = {'question': question, 'answer': answer}
    decks_collection.update_one(
        {"_id": ObjectId(deck_id)},
        {"$push": {"flashcards": flashcard}}
    )
    return jsonify({"message": "Flashcard added successfully!"}), 201

if __name__ == '__main__':
    app.run(debug=True)
