from flask import Flask, jsonify, request

app = Flask(__name__)

# Temporary expense data
expenses = []


@app.route("/")
def home():
    return "Smart Expense Management System - Flask Backend Running!"


# GET API - View all expenses
@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    return jsonify(expenses)


# POST API - Add a new expense
@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    expense = {
        "id": len(expenses) + 1,
        "amount": data.get("amount"),
        "category": data.get("category"),
        "date": data.get("date"),
        "description": data.get("description")
    }

    expenses.append(expense)

    return jsonify({
        "message": "Expense added successfully",
        "expense": expense
    }), 201


# PUT API - Update an expense
@app.route("/api/expenses/<int:expense_id>", methods=["PUT"])
def update_expense(expense_id):
    data = request.get_json()

    for expense in expenses:
        if expense["id"] == expense_id:
            expense["amount"] = data.get("amount", expense["amount"])
            expense["category"] = data.get("category", expense["category"])
            expense["date"] = data.get("date", expense["date"])
            expense["description"] = data.get(
                "description",
                expense["description"]
            )

            return jsonify({
                "message": "Expense updated successfully",
                "expense": expense
            })

    return jsonify({"error": "Expense not found"}), 404


# DELETE API - Delete an expense
@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    for expense in expenses:
        if expense["id"] == expense_id:
            expenses.remove(expense)

            return jsonify({
                "message": "Expense deleted successfully"
            })

    return jsonify({"error": "Expense not found"}), 404


if __name__ == "__main__":
    app.run(debug=True)