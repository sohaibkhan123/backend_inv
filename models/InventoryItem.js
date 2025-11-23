const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  itemCode: { type: String, required: true },
  prNumber: { type: String, required: true },
  description: { type: String, required: true },
  weight: { type: Number, required: true },
  prQty: { type: Number, required: true },
  requiredQty: { type: Number, required: true },
  receivedQty: { type: Number, required: true },
  projectId: { type: String, required: true },
}, {
  timestamps: true,
});

inventoryItemSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
