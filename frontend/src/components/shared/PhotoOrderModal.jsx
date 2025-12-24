import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { ImageUpload } from "./ImageUpload";
import { PhotoItemForm } from "./PhotoItemForm";


export function PhotoOrderModal({ isOpen, onClose, onSave, instanceId, editOrder }) {
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });
    const [items, setItems] = useState([]);
    const [description, setDescription] = useState("");
    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
    const [image, setImage] = useState(null);

    useEffect(() => {
        if (editOrder) {
            // Populate form for editing
            setCustomer({
                name: editOrder.customer?.name || '',
                mobile: editOrder.customer?.mobile || '',
                id: editOrder.customer?.id || ''
            });

            try {
                setItems(JSON.parse(editOrder.itemsJson || '[]'));
            } catch (e) { setItems([]); }

            setPayment({
                mode: editOrder.payment?.paymentMode || 'Cash',
                total: editOrder.payment?.totalAmount || 0,
                discount: editOrder.payment?.discountAmount || 0,
                advance: editOrder.payment?.advanceAmount || 0
            });

            setDescription(editOrder.description || "");
        }
    }, [editOrder]);

    // Auto-calculate total from items (Only if NOT loading existing? Or always?
    // If I edit items, it should recalc.
    // Issue: If I load existing, this effect might run and overwrite values?
    // items state changes -> effect runs -> updates payment.
    // If setPayment sets initial, then setItems sets items, effect runs.
    // If parsedItems match calculated total, it's fine.
    // But if there was a discrepancy, it might auto-correct. Which is usually good.
    useEffect(() => {
        const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        const totalBasePrice = items.reduce((sum, item) => sum + ((parseFloat(item.basePrice) || 0) * item.quantity), 0);

        setPayment(prev => {
            if (prev.total === totalAmount && prev.advance === totalBasePrice) return prev;
            // Only update total and recommended advance, preserve paid/discount if possible?
            // But payment total MUST match items total.
            // So updating is correct.
            return { ...prev, total: totalAmount };
        });
    }, [items]);

    const handleSearchCustomer = () => {
        if (customer.mobile === '9999999999') {
            setCustomer({ ...customer, name: 'Existing User', id: 'CUST001' })
        } else {
            alert("Customer not found (Mock)");
        }
    }

    const handleSave = () => {
        if (!customer.mobile && !editOrder && !customer.id) {
            // Basic mobile check? 
            // If editing, maybe mobile is missing in object but ID exists? 
            // Frontend form requires mobile usually.
        }

        const newOrder = {
            orderId: editOrder?.orderId,
            customer,
            items,
            description,
            payment,
            image
        };
        onSave(newOrder);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Photo Order" className="max-w-4xl h-[90vh] flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <CustomerInfo
                            customer={customer}
                            setCustomer={setCustomer}
                            onSearch={handleSearchCustomer}
                            instanceId={instanceId}
                        />
                        <ImageUpload
                            image={image}
                            onUpload={setImage}
                            onRemove={() => setImage(null)}
                            photoId={customer.id ? `IMG_${customer.id}` : null}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <PhotoItemForm
                            items={items}
                            setItems={setItems}
                            description={description}
                            setDescription={setDescription}
                        />
                        <PaymentMode
                            payment={payment}
                            setPayment={setPayment}
                            minAdvance={items.reduce((sum, item) => sum + ((parseFloat(item.basePrice) || 0) * item.quantity), 0)}
                        />
                    </div>
                </div>
            </div>

            <div className="border-t p-4 flex justify-end gap-2 bg-muted/50 rounded-b-lg">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save Order</Button>
            </div>
        </Modal>
    );
}
